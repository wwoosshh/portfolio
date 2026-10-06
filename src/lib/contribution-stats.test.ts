import { describe, expect, test } from 'vitest';
import { byRepo, contributionPriority, printRows, shortRepo, sortByPriority, tally } from './contribution-stats';
import { contributionSchema, type Contribution } from './schema';

const make = (o: Partial<Contribution> & Pick<Contribution, 'repo' | 'kind' | 'number'>): Contribution =>
  contributionSchema.parse({
    title: 'title',
    state: 'open',
    url: `https://github.com/${o.repo}/${o.kind === 'pr' ? 'pull' : 'issues'}/${o.number}`,
    project: null,
    createdAt: '2026-09-29T10:00:00Z',
    ...(o.state === 'merged' ? { mergedAt: '2026-09-30T05:00:00Z' } : {}),
    ...o,
  });

const T = 'pytorch/pytorch';
const mixed: Contribution[] = [
  make({ repo: T, kind: 'issue', number: 1, labels: ['triaged'] }),
  make({ repo: T, kind: 'issue', number: 2, state: 'closed', stateReason: 'completed', labels: ['triaged'] }),
  make({ repo: T, kind: 'issue', number: 3, state: 'closed', stateReason: 'not_planned' }),
  make({ repo: T, kind: 'issue', number: 4 }),
  make({ repo: T, kind: 'pr', number: 10, state: 'merged' }),
  make({ repo: T, kind: 'pr', number: 11, review: 'approved' }),
  make({ repo: T, kind: 'pr', number: 12, review: 'changes_requested' }),
  make({ repo: T, kind: 'pr', number: 13, review: 'review_required' }),
  make({ repo: T, kind: 'pr', number: 14, state: 'closed' }),
  make({ repo: 'vllm-project/vllm', kind: 'issue', number: 20 }),
];

describe('tally', () => {
  test('섞인 목록의 이슈·PR·병합·승인·변경 요청·닫힘·해결·분류를 센다', () => {
    expect(tally(mixed)).toEqual({
      repos: 2,
      issues: 5,
      prs: 5,
      merged: 1,
      approved: 1,
      changesRequested: 1,
      openPrs: 3,
      closedPrs: 1,
      resolvedIssues: 1,
      triagedIssues: 2,
      openIssues: 3,
    });
  });
  test('열린 PR에는 승인된 열린 PR도 들어간다', () => {
    const t = tally([make({ repo: T, kind: 'pr', number: 1, review: 'approved' }), make({ repo: T, kind: 'pr', number: 2 })]);
    expect(t.openPrs).toBe(2);
    expect(t.approved).toBe(1);
  });
  test('닫힌 PR의 리뷰 결정은 승인·변경 요청에 세지 않는다', () => {
    const t = tally([make({ repo: T, kind: 'pr', number: 1, state: 'closed', review: 'approved' })]);
    expect(t).toMatchObject({ approved: 0, changesRequested: 0, openPrs: 0, closedPrs: 1 });
  });
  test('빈 목록은 모두 0이다', () => {
    expect(tally([])).toEqual({
      repos: 0,
      issues: 0,
      prs: 0,
      merged: 0,
      approved: 0,
      changesRequested: 0,
      openPrs: 0,
      closedPrs: 0,
      resolvedIssues: 0,
      triagedIssues: 0,
      openIssues: 0,
    });
  });
});

describe('byRepo', () => {
  const items = [
    make({ repo: 'z/zed', kind: 'issue', number: 1 }),
    make({ repo: 'z/zed', kind: 'issue', number: 2 }),
    make({ repo: 'z/zed', kind: 'issue', number: 3 }),
    make({ repo: 'y/why', kind: 'issue', number: 1 }),
    make({ repo: 'y/why', kind: 'issue', number: 2 }),
    make({ repo: 'y/why', kind: 'issue', number: 3 }),
    make({ repo: 'w/dub', kind: 'pr', number: 1, state: 'merged' }),
    make({ repo: 'x/ex', kind: 'pr', number: 1, state: 'merged' }),
    make({ repo: 'x/ex', kind: 'issue', number: 2 }),
  ];

  test('병합 많은 순, 항목 많은 순, 저장소 이름순으로 정렬한다', () => {
    expect(byRepo(items).map((g) => g.repo)).toEqual(['x/ex', 'w/dub', 'y/why', 'z/zed']);
  });
  test('묶음마다 항목과 집계를 담는다', () => {
    const group = byRepo(items).find((g) => g.repo === 'x/ex');
    expect(group?.items.map((i) => i.number)).toEqual([1, 2]);
    expect(group?.tally).toMatchObject({ repos: 1, merged: 1, prs: 1, issues: 1 });
  });
  test('찾은 도구는 중복과 null을 뺀 project 목록이다', () => {
    const group = byRepo([
      make({ repo: T, kind: 'issue', number: 1, project: 'torch-compile-fuzzer' }),
      make({ repo: T, kind: 'issue', number: 2, project: null }),
      make({ repo: T, kind: 'pr', number: 3, project: 'torch-compile-fuzzer' }),
      make({ repo: T, kind: 'pr', number: 4, project: 'entail' }),
    ])[0];
    expect(group.tools).toEqual(['torch-compile-fuzzer', 'entail']);
  });
  test('저장소 이름순은 문자 코드 순이다(실행 환경의 정렬 규칙에 기대지 않는다)', () => {
    const out = byRepo([
      make({ repo: 'a/a', kind: 'issue', number: 1 }),
      make({ repo: 'Z/z', kind: 'issue', number: 1 }),
      make({ repo: 'B/b', kind: 'issue', number: 1 }),
    ]);
    // 대문자가 소문자보다 앞이다. localeCompare는 환경에 따라 a, B, Z 순으로 돌려준다.
    expect(out.map((g) => g.repo)).toEqual(['B/b', 'Z/z', 'a/a']);
  });
  test('빈 목록은 빈 배열이다', () => {
    expect(byRepo([])).toEqual([]);
  });
});

describe('contributionPriority', () => {
  const rank = (o: Parameters<typeof make>[0]) => contributionPriority(make(o));

  test('병합 → 승인된 열린 PR → 결정 없는 열린 PR → 변경 요청 → 해결된 이슈 → 열린 이슈 → 닫힌 PR → 그 밖의 닫힌 이슈 순으로 0부터 7', () => {
    expect([
      rank({ repo: T, kind: 'pr', number: 1, state: 'merged' }),
      rank({ repo: T, kind: 'pr', number: 2, review: 'approved' }),
      rank({ repo: T, kind: 'pr', number: 3 }),
      rank({ repo: T, kind: 'pr', number: 4, review: 'changes_requested' }),
      rank({ repo: T, kind: 'issue', number: 5, state: 'closed', stateReason: 'completed' }),
      rank({ repo: T, kind: 'issue', number: 6 }),
      rank({ repo: T, kind: 'pr', number: 7, state: 'closed' }),
      rank({ repo: T, kind: 'issue', number: 8, state: 'closed', stateReason: 'not_planned' }),
    ]).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  test('리뷰 결정이 review_required인 열린 PR은 결정 없는 PR과 같다', () => {
    expect(rank({ repo: T, kind: 'pr', number: 1, review: 'review_required' })).toBe(2);
  });
  test('병합·닫힌 PR의 리뷰 결정은 순위에 영향을 주지 않는다', () => {
    expect(rank({ repo: T, kind: 'pr', number: 1, state: 'merged', review: 'approved' })).toBe(0);
    expect(rank({ repo: T, kind: 'pr', number: 2, state: 'closed', review: 'approved' })).toBe(6);
  });
  test('사유가 completed가 아니거나 없는 닫힌 이슈는 7이고, triaged 라벨은 열린 이슈 순위를 바꾸지 않는다', () => {
    expect(rank({ repo: T, kind: 'issue', number: 1, state: 'closed' })).toBe(7);
    expect(rank({ repo: T, kind: 'issue', number: 2, state: 'closed', stateReason: 'duplicate' })).toBe(7);
    expect(rank({ repo: T, kind: 'issue', number: 3, labels: ['triaged'] })).toBe(5);
  });
});

describe('sortByPriority', () => {
  test('우선순위가 높은 것부터, 같은 순위에서는 번호가 큰 것부터 두고 원본은 바꾸지 않는다', () => {
    const items = [
      make({ repo: T, kind: 'issue', number: 1 }),
      make({ repo: T, kind: 'pr', number: 10 }),
      make({ repo: T, kind: 'issue', number: 7 }),
      make({ repo: T, kind: 'pr', number: 30, state: 'merged' }),
      make({ repo: T, kind: 'pr', number: 20, state: 'merged' }),
      make({ repo: T, kind: 'pr', number: 15, review: 'approved' }),
      make({ repo: T, kind: 'pr', number: 12, state: 'closed' }),
      make({ repo: T, kind: 'issue', number: 9, state: 'closed', stateReason: 'completed' }),
    ];
    expect(sortByPriority(items).map((c) => `${c.kind}#${c.number}`)).toEqual([
      'pr#30',
      'pr#20',
      'pr#15',
      'pr#10',
      'issue#9',
      'issue#7',
      'issue#1',
      'pr#12',
    ]);
    expect(items.map((c) => c.number)).toEqual([1, 10, 7, 30, 20, 15, 12, 9]);
  });
  test('병합은 번호가 더 작아도 열린 이슈보다 앞이고, PR이 아니어도 해결된 이슈가 열린 PR 뒤에 온다', () => {
    const out = sortByPriority([
      make({ repo: T, kind: 'issue', number: 900 }),
      make({ repo: T, kind: 'issue', number: 800, state: 'closed', stateReason: 'completed' }),
      make({ repo: T, kind: 'pr', number: 5, state: 'merged' }),
      make({ repo: T, kind: 'pr', number: 6, review: 'changes_requested' }),
    ]);
    expect(out.map((c) => c.number)).toEqual([5, 6, 800, 900]);
  });
  test('빈 목록은 빈 배열이다', () => {
    expect(sortByPriority([])).toEqual([]);
  });
});

describe('printRows', () => {
  const keys = (rows: readonly Contribution[]) => rows.map((c) => `${c.repo}#${c.number}`);
  const numbered = (repo: string, kind: 'pr' | 'issue', from: number, count: number, o: Partial<Contribution> = {}) =>
    Array.from({ length: count }, (_, i) => make({ repo, kind, number: from + i, ...o }));

  // 오늘의 데이터와 같은 구성(15개): PyTorch 12개(병합 1, 승인 1, 리뷰 중 2, 변경 요청 1, 해결 1, 열린 이슈 5, 닫힘 1)와 나머지 세 저장소에 하나씩.
  const today: Contribution[] = [
    make({ repo: 'Comfy-Org/ComfyUI', kind: 'issue', number: 16490 }),
    ...numbered(T, 'issue', 198094, 2, { labels: ['triaged'] }),
    make({ repo: T, kind: 'pr', number: 198096 }),
    make({ repo: T, kind: 'pr', number: 198097, review: 'changes_requested' }),
    ...numbered(T, 'issue', 198100, 3, { labels: ['triaged'] }),
    make({ repo: T, kind: 'pr', number: 198103 }),
    make({ repo: T, kind: 'pr', number: 198104, review: 'approved' }),
    make({ repo: T, kind: 'pr', number: 198105, state: 'closed' }),
    make({ repo: T, kind: 'issue', number: 198131, state: 'closed', stateReason: 'completed' }),
    make({ repo: T, kind: 'pr', number: 198132, state: 'merged', review: 'approved' }),
    make({ repo: 'sgl-project/sglang', kind: 'issue', number: 41227 }),
    make({ repo: 'vllm-project/vllm', kind: 'issue', number: 58675 }),
  ];

  // 스무 개: A 병합 PR 12개, B 열린 이슈 5개, C 닫힌 PR 3개.
  const twenty: Contribution[] = [
    ...numbered('a/a', 'pr', 100, 12, { state: 'merged' }),
    ...numbered('b/b', 'issue', 200, 5),
    ...numbered('c/c', 'pr', 300, 3, { state: 'closed' }),
  ];

  test('오늘의 15개는 모두 들어가고 남는 것이 없다', () => {
    expect(today).toHaveLength(15);
    const { rows, rest } = printRows(today);
    expect(rest).toBe(0);
    expect(keys(rows)).toEqual(keys(byRepo(today).flatMap((g) => sortByPriority(g.items))));
  });

  test('스무 개이면 16줄만 싣고 4건이 남는다', () => {
    const { rows, rest } = printRows(twenty);
    expect(rows).toHaveLength(16);
    expect(rest).toBe(4);
  });

  test('저장소마다 최소 한 줄이 들어가고, 그 줄은 그 저장소에서 우선순위가 가장 높은 항목이다', () => {
    const { rows } = printRows(twenty);
    expect(new Set(rows.map((c) => c.repo))).toEqual(new Set(['a/a', 'b/b', 'c/c']));
    // 닫힌 PR(6)뿐인 C와 열린 이슈(5)뿐인 B도, 병합 PR(0)이 12개나 있는 A에 밀리지 않는다. 각 저장소의 대표는 번호가 가장 큰 항목이다.
    expect(rows.some((c) => c.repo === 'c/c' && c.number === 302)).toBe(true);
    expect(rows.some((c) => c.repo === 'b/b' && c.number === 204)).toBe(true);
  });

  test('남은 자리는 저장소와 상관없이 우선순위 순으로 채운다', () => {
    // 보장된 3줄(A#111, B#204, C#302) 뒤의 13자리: 병합 PR 11개(A#110~#100)가 먼저, 그다음 열린 이슈 2개(B#203, B#202).
    expect(keys(printRows(twenty).rows)).toEqual([
      ...Array.from({ length: 12 }, (_, i) => `a/a#${111 - i}`),
      'b/b#204',
      'b/b#203',
      'b/b#202',
      'c/c#302',
    ]);
  });

  test('저장소 묶음 순서(byRepo)대로, 묶음 안에서는 우선순위 순으로 내보낸다', () => {
    const mixedUp = [...twenty].reverse();
    const { rows } = printRows(mixedUp);
    expect([...new Set(rows.map((c) => c.repo))]).toEqual(byRepo(mixedUp).map((g) => g.repo));
    for (const g of byRepo(mixedUp)) {
      const mine = rows.filter((c) => c.repo === g.repo);
      expect(keys(mine)).toEqual(keys(sortByPriority(mine)));
    }
  });

  test('상한은 인자로 바꿀 수 있고, 원본은 바꾸지 않는다', () => {
    const copy = [...twenty];
    expect(printRows(twenty, 5)).toMatchObject({ rest: 15 });
    expect(printRows(twenty, 5).rows).toHaveLength(5);
    expect(printRows(twenty, 100)).toMatchObject({ rest: 0 });
    expect(twenty).toEqual(copy);
  });

  test('저장소가 상한보다 많아도 저장소마다 한 줄은 싣는다', () => {
    const repos = Array.from({ length: 5 }, (_, i) => make({ repo: `o/r${i}`, kind: 'issue', number: i + 1 }));
    const { rows, rest } = printRows([...repos, ...numbered('o/r0', 'issue', 50, 3)], 3);
    expect(new Set(rows.map((c) => c.repo)).size).toBe(5);
    expect(rows).toHaveLength(5);
    expect(rest).toBe(3);
  });

  test('빈 목록은 줄도 남는 것도 없다', () => {
    expect(printRows([])).toEqual({ rows: [], rest: 0 });
  });
});

describe('shortRepo', () => {
  test('알려진 저장소는 읽기 좋은 이름이다', () => {
    expect(shortRepo('pytorch/pytorch')).toBe('PyTorch');
    expect(shortRepo('vllm-project/vllm')).toBe('vLLM');
    expect(shortRepo('sgl-project/sglang')).toBe('SGLang');
    expect(shortRepo('Comfy-Org/ComfyUI')).toBe('ComfyUI');
  });
  test('그 밖의 저장소는 / 뒤의 이름이다', () => {
    expect(shortRepo('huggingface/transformers')).toBe('transformers');
  });
});
