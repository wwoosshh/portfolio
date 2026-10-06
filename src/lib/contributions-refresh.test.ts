import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  main,
  mergeItems,
  normalize,
  prState,
  relatedQuery,
  sameContent,
  type Data,
  type GqlNode,
  type Item,
} from '../../scripts/refresh-contributions';

const node = (o: Partial<GqlNode> & Pick<GqlNode, '__typename' | 'number'>): GqlNode => ({
  url: `https://github.com/pytorch/pytorch/${o.__typename === 'Issue' ? 'issues' : 'pull'}/${o.number}`,
  title: 'title',
  state: 'OPEN',
  closedAt: null,
  createdAt: '2026-09-29T10:00:00Z',
  repository: { nameWithOwner: 'pytorch/pytorch' },
  labels: { nodes: [] },
  ...o,
});

const item = (o: Partial<Item> & Pick<Item, 'repo' | 'number'>): Item => ({
  kind: 'pr',
  title: 'title',
  state: 'open',
  stateReason: null,
  review: null,
  url: `https://github.com/${o.repo}/pull/${o.number}`,
  project: null,
  labels: [],
  createdAt: '2026-09-29T10:00:00Z',
  closedAt: null,
  mergedAt: null,
  related: [],
  ...o,
});

const data = (o: Partial<Data> = {}): Data => ({
  asOf: '2026-09-30T00:00:00Z',
  author: 'wwoosshh',
  excludeOwners: ['wwoosshh', 'semicollon-club'],
  ignore: [],
  items: [item({ repo: 'pytorch/pytorch', number: 1 })],
  own: {
    asahi: { mergedPrs: 81, mineMergedPrs: 79, url: 'https://github.com/semicollon-club/asahi/pulls' },
    entail: { pypiReleases: 19, pypiLatest: '2.4.0', url: 'https://pypi.org/project/entail-ai/' },
  },
  ...o,
});

describe('prState', () => {
  test('merged가 참이면 병합', () => {
    expect(prState({ state: 'MERGED', merged: true, labels: [] })).toBe('merged');
  });
  test('봇이 병합하고 닫은 PR은 닫혔고 Merged 라벨이 있으면 병합', () => {
    expect(prState({ state: 'CLOSED', merged: false, labels: ['Merged', 'cla signed'] })).toBe('merged');
  });
  test('Merged 라벨 없이 닫힌 PR은 닫힘', () => {
    expect(prState({ state: 'CLOSED', merged: false, labels: ['cla signed'] })).toBe('closed');
  });
  test('열린 PR은 열림', () => {
    expect(prState({ state: 'OPEN', merged: false, labels: [] })).toBe('open');
  });
  test('Merged 라벨은 닫힌 PR에서만 병합으로 읽는다', () => {
    expect(prState({ state: 'OPEN', merged: false, labels: ['Merged'] })).toBe('open');
  });
});

describe('normalize', () => {
  test('닫힌 이슈는 해결 사유를 소문자로 옮긴다', () => {
    const n = normalize(node({ __typename: 'Issue', number: 5, state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-09-30T08:00:00Z' }));
    expect(n).toMatchObject({ kind: 'issue', state: 'closed', stateReason: 'completed', review: null, mergedAt: null });
    expect(n.closedAt).toBe('2026-09-30T08:00:00Z');
  });
  test('계획 없이 닫힌 이슈는 not_planned', () => {
    const n = normalize(node({ __typename: 'Issue', number: 5, state: 'CLOSED', stateReason: 'NOT_PLANNED' }));
    expect(n.stateReason).toBe('not_planned');
  });
  test('열린 이슈는 사유가 없다', () => {
    const n = normalize(node({ __typename: 'Issue', number: 6, state: 'OPEN', stateReason: 'REOPENED' }));
    expect(n).toMatchObject({ state: 'open', stateReason: null });
  });
  test('PR의 리뷰 결정을 소문자로 옮기고, 이슈 사유는 없다', () => {
    const n = normalize(node({ __typename: 'PullRequest', number: 7, merged: false, reviewDecision: 'CHANGES_REQUESTED' }));
    expect(n).toMatchObject({ kind: 'pr', state: 'open', review: 'changes_requested', stateReason: null });
  });
  test('리뷰 결정이 없는 PR은 review가 null', () => {
    const n = normalize(node({ __typename: 'PullRequest', number: 7, merged: false, reviewDecision: null }));
    expect(n.review).toBeNull();
  });
  test('GitHub가 병합한 PR은 mergedAt을 그대로 쓴다', () => {
    const n = normalize(
      node({
        __typename: 'PullRequest',
        number: 8,
        state: 'MERGED',
        merged: true,
        mergedAt: '2026-09-30T07:00:00Z',
        closedAt: '2026-09-30T07:00:01Z',
      }),
    );
    expect(n).toMatchObject({ state: 'merged', mergedAt: '2026-09-30T07:00:00Z' });
  });
  test('PyTorch처럼 봇이 병합한 PR은 mergedAt을 closedAt으로 채운다', () => {
    const n = normalize(
      node({
        __typename: 'PullRequest',
        number: 198132,
        state: 'CLOSED',
        merged: false,
        mergedAt: null,
        closedAt: '2026-09-30T05:00:00Z',
        labels: { nodes: [{ name: 'Merged' }, { name: 'ciflow/trunk' }] },
      }),
    );
    expect(n).toMatchObject({ state: 'merged', mergedAt: '2026-09-30T05:00:00Z', closedAt: '2026-09-30T05:00:00Z' });
  });
  test('병합되지 않고 닫힌 PR은 mergedAt이 없다', () => {
    const n = normalize(node({ __typename: 'PullRequest', number: 9, state: 'CLOSED', merged: false, closedAt: '2026-09-30T05:00:00Z' }));
    expect(n).toMatchObject({ state: 'closed', mergedAt: null });
  });
  test('라벨은 정렬해서 내놓고, 저장소와 번호·주소를 옮긴다', () => {
    const n = normalize(node({ __typename: 'Issue', number: 10, labels: { nodes: [{ name: 'c' }, { name: 'a' }, { name: 'b' }] } }));
    expect(n.labels).toEqual(['a', 'b', 'c']);
    expect(n).toMatchObject({ repo: 'pytorch/pytorch', number: 10, url: 'https://github.com/pytorch/pytorch/issues/10' });
  });
});

describe('mergeItems', () => {
  test('사람이 관리하는 project·note·related는 기존 값을 지키고, 기계 필드는 새 값으로 바꾼다', () => {
    const related = [
      {
        repo: 'sgl-project/sglang',
        number: 41239,
        title: 'fix',
        state: 'closed' as const,
        url: 'https://github.com/sgl-project/sglang/pull/41239',
        author: 'someone',
      },
    ];
    const existing = [item({ repo: 'pytorch/pytorch', number: 1, project: 'torch-compile-fuzzer', note: '절차 안내', related, title: '옛 제목' })];
    const { project: _project, note: _note, related: _related, ...fresh } = item({ repo: 'pytorch/pytorch', number: 1, title: '새 제목', state: 'closed' });
    const out = mergeItems(existing, [fresh], []);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: '새 제목', state: 'closed', project: 'torch-compile-fuzzer', note: '절차 안내', related });
  });
  test('새로 찾은 항목은 project가 null이고 related가 비어 있다', () => {
    const { project: _project, related: _related, ...fresh } = item({ repo: 'pytorch/pytorch', number: 2 });
    const out = mergeItems([], [fresh], []);
    expect(out).toHaveLength(1);
    expect(out[0].project).toBeNull();
    expect(out[0].related).toEqual([]);
    expect('note' in out[0]).toBe(false);
  });
  test('ignore에 적힌 항목은 기존과 새 결과 양쪽에서 뺀다', () => {
    const existing = [item({ repo: 'a/b', number: 1 }), item({ repo: 'a/b', number: 3 })];
    const fresh = [item({ repo: 'a/b', number: 1 }), item({ repo: 'a/b', number: 2 })].map(
      ({ project: _project, related: _related, ...rest }) => rest,
    );
    const out = mergeItems(existing, fresh, ['a/b#1']);
    expect(out.map((i) => `${i.repo}#${i.number}`)).toEqual(['a/b#2', 'a/b#3']);
  });
  test('검색 결과에서 빠진 기존 항목은 그대로 남긴다', () => {
    const kept = item({ repo: 'a/b', number: 9, project: 'entail', state: 'closed', title: '남는 항목' });
    const out = mergeItems([kept], [], []);
    expect(out).toEqual([kept]);
  });
  test('저장소, 번호 순으로 정렬한다', () => {
    const existing = [item({ repo: 'z/z', number: 1 }), item({ repo: 'a/b', number: 10 }), item({ repo: 'a/b', number: 2 })];
    expect(mergeItems(existing, [], []).map((i) => `${i.repo}#${i.number}`)).toEqual(['a/b#2', 'a/b#10', 'z/z#1']);
  });
});

describe('sameContent', () => {
  test('asOf만 다르면 같은 내용이다', () => {
    expect(sameContent(data(), data({ asOf: '2026-10-07T00:00:00Z' }))).toBe(true);
  });
  test('항목의 상태가 바뀌면 다른 내용이다', () => {
    const changed = data({ items: [item({ repo: 'pytorch/pytorch', number: 1, state: 'closed' })] });
    expect(sameContent(data(), changed)).toBe(false);
  });
  test('내 프로젝트 수치가 바뀌면 다른 내용이다', () => {
    const base = data();
    const changed = data({ own: { ...base.own, entail: { pypiReleases: 20, pypiLatest: '2.5.0', url: 'https://pypi.org/project/entail-ai/' } } });
    expect(sameContent(base, changed)).toBe(false);
  });
});

describe('relatedQuery', () => {
  test('r0, r1 … 별칭으로 저장소마다 PR을 묻고, 소유자와 이름은 JSON 문자열로 감싼다', () => {
    const q = relatedQuery([
      { repo: 'vllm-project/vllm', number: 58679 },
      { repo: 'sgl-project/sglang', number: 41239 },
    ]);
    expect(q.startsWith('query { ')).toBe(true);
    expect(q.endsWith(' }')).toBe(true);
    expect(q).toContain('r0: repository(owner: "vllm-project", name: "vllm") { pullRequest(number: 58679) {');
    expect(q).toContain('r1: repository(owner: "sgl-project", name: "sglang") { pullRequest(number: 41239) {');
    expect(q.indexOf('r0:')).toBeLessThan(q.indexOf('r1:'));
  });
  test('따옴표가 들어가도 문자열이 깨지지 않는다', () => {
    expect(relatedQuery([{ repo: 'o"x/n', number: 1 }])).toContain('owner: "o\\"x"');
  });
});

// main()을 네트워크 없이 돌린다: fetch를 가짜로 바꾸고, 임시 파일에 쓴다.
describe('main', () => {
  const issue = {
    __typename: 'Issue',
    number: 58675,
    url: 'https://github.com/vllm-project/vllm/issues/58675',
    title: 'bug',
    state: 'OPEN',
    stateReason: null,
    createdAt: '2026-09-23T05:49:51Z',
    closedAt: null,
    repository: { nameWithOwner: 'vllm-project/vllm' },
    labels: { nodes: [] },
  };
  const seed = {
    asOf: '2026-09-30T00:00:00Z',
    author: 'wwoosshh',
    excludeOwners: ['wwoosshh', 'semicollon-club'],
    ignore: [],
    items: [{ repo: 'vllm-project/vllm', kind: 'issue', number: 58675, project: 'entail', related: [{ repo: 'vllm-project/vllm', number: 58679 }] }],
    own: {},
  };

  // 관련 PR의 상태만 바꿔 가며 GitHub·PyPI 응답을 흉내 낸다.
  let relatedState: 'OPEN' | 'MERGED' = 'OPEN';
  const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    if (String(input).includes('pypi.org')) {
      return Response.json({ info: { version: '2.4.0' }, releases: { '2.4.0': [{ yanked: false }], '2.3.0': [{ yanked: true }], '2.2.0': [] } });
    }
    const { query } = JSON.parse(String(init?.body)) as { query: string };
    if (query.includes('search(')) {
      return Response.json({ data: { search: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [issue] } } });
    }
    if (query.includes('r0:')) {
      const pullRequest = {
        number: 58679,
        url: 'https://github.com/vllm-project/vllm/pull/58679',
        title: 'fix',
        state: relatedState,
        merged: relatedState === 'MERGED',
        closedAt: null,
        author: { login: 'someone' },
        labels: { nodes: [] },
      };
      return Response.json({ data: { r0: { pullRequest } } });
    }
    const pageInfo = { hasNextPage: false, endCursor: null };
    return Response.json({ data: { repository: { pullRequests: { totalCount: 3, pageInfo, nodes: [{ author: { login: 'wwoosshh' } }, { author: { login: 'wwoosshh' } }, { author: null }] } } } });
  };

  let dir: string;
  let file: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'refresh-'));
    file = path.join(dir, 'contributions.json');
    await writeFile(file, JSON.stringify(seed));
    relatedState = 'OPEN';
    vi.stubGlobal('fetch', vi.fn(fakeFetch));
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });
  const read = async () => JSON.parse(await readFile(file, 'utf8')) as Data;

  test('처음에는 기계 필드를 채워 쓰고, 바뀐 것이 없으면 파일을 건드리지 않는다', async () => {
    expect(await main(file)).toBe(true);
    const first = await read();
    expect(first.items[0]).toMatchObject({ project: 'entail', state: 'open', related: [{ number: 58679, state: 'open', author: 'someone' }] });
    expect(first.own).toMatchObject({ asahi: { mergedPrs: 3, mineMergedPrs: 2 }, entail: { pypiReleases: 1, pypiLatest: '2.4.0' } });
    expect(Object.keys(first)).toEqual(['asOf', 'author', 'excludeOwners', 'ignore', 'items', 'own']);

    const before = await readFile(file, 'utf8');
    expect(await main(file)).toBe(false);
    expect(await readFile(file, 'utf8')).toBe(before);
  });

  // 이슈 자체는 그대로이고 관련 PR의 상태만 바뀌는 날에도 파일을 갱신해야 한다.
  test('관련 PR의 상태만 바뀌어도 갱신하고 asOf를 새로 쓴다', async () => {
    await main(file);
    const before = await read();

    relatedState = 'MERGED';
    expect(await main(file)).toBe(true);
    const after = await read();
    expect(after.items[0].related[0].state).toBe('merged');
    expect(after.asOf).not.toBe(before.asOf);
  });
});
