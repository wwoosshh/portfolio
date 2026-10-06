import { describe, expect, test } from 'vitest';
import { byRepo, shortRepo, tally } from './contribution-stats';
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
      inReview: 3,
      closedPrs: 1,
      resolvedIssues: 1,
      triagedIssues: 2,
      openIssues: 3,
    });
  });
  test('리뷰 중에는 승인된 열린 PR도 들어간다', () => {
    const t = tally([make({ repo: T, kind: 'pr', number: 1, review: 'approved' }), make({ repo: T, kind: 'pr', number: 2 })]);
    expect(t.inReview).toBe(2);
    expect(t.approved).toBe(1);
  });
  test('닫힌 PR의 리뷰 결정은 승인·변경 요청에 세지 않는다', () => {
    const t = tally([make({ repo: T, kind: 'pr', number: 1, state: 'closed', review: 'approved' })]);
    expect(t).toMatchObject({ approved: 0, changesRequested: 0, inReview: 0, closedPrs: 1 });
  });
  test('빈 목록은 모두 0이다', () => {
    expect(tally([])).toEqual({
      repos: 0,
      issues: 0,
      prs: 0,
      merged: 0,
      approved: 0,
      changesRequested: 0,
      inReview: 0,
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
  test('빈 목록은 빈 배열이다', () => {
    expect(byRepo([])).toEqual([]);
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
