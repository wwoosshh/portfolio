import { readFileSync } from 'node:fs';
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
    // 병합 판정에는 Merged 라벨을 썼고, 사이트가 쓰는 라벨이므로 남는다. 나머지는 버린다.
    expect(n.labels).toEqual(['Merged']);
  });
  test('병합되지 않고 닫힌 PR은 mergedAt이 없다', () => {
    const n = normalize(node({ __typename: 'PullRequest', number: 9, state: 'CLOSED', merged: false, closedAt: '2026-09-30T05:00:00Z' }));
    expect(n).toMatchObject({ state: 'closed', mergedAt: null });
  });
  test('저장소와 번호·주소를 옮긴다', () => {
    const n = normalize(node({ __typename: 'Issue', number: 10 }));
    expect(n).toMatchObject({ repo: 'pytorch/pytorch', number: 10, url: 'https://github.com/pytorch/pytorch/issues/10' });
  });
  // PyTorch는 ciflow/*·merging 같은 라벨이 자주 바뀐다. 사이트가 쓰지 않는 라벨까지 저장하면 보이는 변화 없이 매일 커밋과 배포가 생긴다.
  test('사이트가 쓰는 라벨(Merged, triaged)만 정렬해서 남기고 나머지는 버린다', () => {
    const names = ['triaged', 'ciflow/trunk', 'Merged', 'merging', 'module: inductor', 'cla signed'];
    const n = normalize(node({ __typename: 'Issue', number: 10, labels: { nodes: names.map((name) => ({ name })) } }));
    expect(n.labels).toEqual(['Merged', 'triaged']);
  });
  test('Merged 라벨로 병합을 판정한 뒤에 라벨을 거른다(라벨을 먼저 거르면 병합이 닫힘이 된다)', () => {
    const closedByBot = node({
      __typename: 'PullRequest',
      number: 11,
      state: 'CLOSED',
      merged: false,
      closedAt: '2026-09-30T05:00:00Z',
      labels: { nodes: [{ name: 'ciflow/trunk' }, { name: 'Merged' }, { name: 'merging' }] },
    });
    expect(normalize(closedByBot)).toMatchObject({ state: 'merged', labels: ['Merged'] });
  });
  test('라벨이 바뀌어도 사이트가 쓰는 라벨이 같으면 같은 내용이다', () => {
    const labelled = (names: string[]) =>
      normalize(node({ __typename: 'Issue', number: 12, labels: { nodes: names.map((name) => ({ name })) } }));
    expect(labelled(['triaged', 'ciflow/trunk']).labels).toEqual(labelled(['triaged', 'merging', 'module: dynamo']).labels);
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
  /** fetch에 실제로 나간 GraphQL 요청 본문들. */
  const requests = () =>
    vi
      .mocked(fetch)
      .mock.calls.filter(([input]) => String(input).includes('api.github.com'))
      .map(([, init]) => JSON.parse(String(init?.body)) as { query: string; variables: { q?: string } });

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

  // 개인 토큰(repo 범위)으로 로컬에서 돌려도 비공개 저장소의 제목과 주소가 공개 JSON에 들어가면 안 된다.
  test('검색은 공개 저장소로 한정하고, 작성자 본인과 제외 소유자를 검색에서 뺀다', async () => {
    await main(file);
    const search = requests().find((r) => r.query.includes('search('));
    expect(search?.variables.q).toBe('author:wwoosshh -user:wwoosshh is:public -org:semicollon-club');
  });

  test('제외 소유자가 작성자이면 -org로 한 번 더 빼지 않는다(대소문자 무시)', async () => {
    await writeFile(file, JSON.stringify({ ...seed, author: 'WwooSShh', excludeOwners: ['wwoosshh', 'a-org', 'b-org'] }));
    await main(file);
    const search = requests().find((r) => r.query.includes('search('));
    expect(search?.variables.q).toBe('author:WwooSShh -user:WwooSShh is:public -org:a-org -org:b-org');
  });

  test('GitHub가 거절하면 응답의 message를 오류에 담고, 토큰은 담지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'Bad credentials', documentation_url: 'https://docs.github.com/graphql' }, { status: 401 })),
    );
    const failure = await main(file).then(
      () => null,
      (error: Error) => error,
    );
    expect(failure?.message).toContain('401');
    expect(failure?.message).toContain('Bad credentials');
    expect(failure?.message).not.toContain('test-token');
  });

  test('본문이 JSON이 아닌 응답(502 등)도 상태 코드가 보이는 오류가 된다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(main(file)).rejects.toThrow(/502/);
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

describe('워크플로', () => {
  const yml = readFileSync(new URL('../../.github/workflows/refresh-contributions.yml', import.meta.url), 'utf8');
  // 각 단계의 글(주석은 뺀다). 단계는 6칸 들여 쓴 `- `로 시작한다.
  const steps = yml.replace(/^\s*#.*$/gm, '').split(/^ {6}- /m).slice(1);
  const GATE = "if: steps.changed.outputs.changed == 'true'";

  test('매일 21:17 UTC(06:17 KST, 정각의 혼잡을 피함)에 돌고, 20분 안에 끝나지 않으면 멈춘다', () => {
    expect(yml).toMatch(/cron:\s*'17 21 \* \* \*'/);
    expect(yml).toMatch(/^\s+timeout-minutes:\s*20\s*$/m);
  });

  test('단계 순서: 갱신, 변경 확인, 검증, JSON 커밋, 브라우저 설치, PDF, e2e, PDF 커밋', () => {
    const order = [
      'scripts/refresh-contributions.ts',
      'git diff --quiet -- src/data/contributions.json',
      'npm test && npm run build',
      'chore(data): 오픈소스 기여 상태 자동 갱신',
      'npx playwright install --with-deps chromium',
      'node scripts/make-pdf.mjs',
      'npx playwright test',
      'chore(data): 공개 PDF 자동 갱신',
    ].map((needle) => {
      const at = steps.findIndex((step) => step.includes(needle));
      expect(at, needle).toBeGreaterThan(-1);
      return at;
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length); // 단계마다 하나씩
  });

  test('바뀐 것이 없으면 "변경 없음"을 알리고, 그 뒤의 모든 단계는 바뀐 날에만 돈다', () => {
    const detect = steps.findIndex((step) => step.includes('id: changed'));
    expect(detect).toBeGreaterThan(-1);
    expect(steps[detect]).toContain('echo "변경 없음"');
    expect(steps[detect]).toContain('changed=false');
    expect(steps[detect]).toContain('changed=true');
    const later = steps.slice(detect + 1);
    expect(later.length).toBeGreaterThan(0);
    for (const step of later) expect(step, step.split('\n')[0]).toContain(GATE);
    // 변경 확인 앞의 단계(내려받기, 설치, 갱신)에는 걸지 않는다.
    for (const step of steps.slice(0, detect)) expect(step).not.toContain(GATE);
  });

  test('JSON 커밋은 봇 이름으로, 트레일러 없이 올린다', () => {
    const data = steps.find((step) => step.includes('chore(data): 오픈소스 기여 상태 자동 갱신')) ?? '';
    expect(data).toContain('git add src/data/contributions.json');
    expect(data).toContain('github-actions[bot]');
    expect(data).toContain('git push');
    expect(yml).not.toMatch(/Co-Authored-By/i);
  });

  test('PDF는 이미 있는 빌드로 make-pdf를 직접 돌리고(다시 빌드하지 않음), e2e 전에 끝낸다', () => {
    expect(yml).not.toMatch(/npm run pdf/);
    const pdf = steps.findIndex((step) => step.includes('node scripts/make-pdf.mjs'));
    const e2e = steps.findIndex((step) => step.includes('npx playwright test'));
    // 미리보기 서버는 프로젝트당 하나뿐이라, make-pdf와 Playwright를 한 단계에 묶거나 함께 띄우지 않는다.
    expect(pdf).not.toBe(e2e);
    expect(steps[pdf]).not.toContain('playwright test');
    expect(steps[e2e]).not.toContain('make-pdf');
  });

  test('브라우저는 Playwright 버전(package-lock.json)을 키로 캐시하고, e2e를 통과한 뒤 바뀐 PDF만 커밋한다', () => {
    const cache = steps.find((step) => step.includes('actions/cache')) ?? '';
    expect(cache).toContain('~/.cache/ms-playwright');
    expect(cache).toMatch(/key:.*steps\.\w+\.outputs\.version/);
    expect(steps.find((step) => step.includes('version=')) ?? '').toContain('package-lock.json');
    const pdfCommit = steps.at(-1) ?? '';
    expect(pdfCommit).toContain('git diff --quiet -- public/portfolio.pdf');
    expect(pdfCommit).toContain('git add public/portfolio.pdf');
    expect(pdfCommit).toContain('chore(data): 공개 PDF 자동 갱신');
  });

  test('PDF나 e2e가 실패하면 작업이 실패하지만 JSON은 이미 올라간 뒤라는 것, PDF는 마지막 성공판이 남는다는 것을 주석으로 적어 둔다', () => {
    expect(yml).toMatch(/^#.*PDF.*마지막/m);
  });
});
