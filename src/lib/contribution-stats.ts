import type { Contribution } from './schema';

// 화면에 보이는 기여 수치는 모두 여기서 계산한다. 숫자를 글에 직접 적지 않는다.
export interface Tally {
  repos: number;
  issues: number;
  prs: number;
  merged: number;
  approved: number;
  changesRequested: number;
  /** 열린 PR 전부. 승인된 PR도 병합되기 전까지는 포함한다. */
  inReview: number;
  closedPrs: number;
  resolvedIssues: number;
  triagedIssues: number;
  openIssues: number;
}

export interface RepoGroup {
  repo: string;
  items: Contribution[];
  tally: Tally;
  /** 이 저장소의 기여를 찾은 도구(대표작 id). 중복과 null은 뺀다. */
  tools: string[];
}

const SHORT_NAMES = new Map([
  ['pytorch/pytorch', 'PyTorch'],
  ['vllm-project/vllm', 'vLLM'],
  ['sgl-project/sglang', 'SGLang'],
  ['Comfy-Org/ComfyUI', 'ComfyUI'],
]);

export function shortRepo(repo: string): string {
  return SHORT_NAMES.get(repo) ?? repo.split('/')[1] ?? repo;
}

/** 한 저장소 안의 순서: PR을 먼저, 같은 종류끼리는 번호가 작은 순. 홈의 보드와 인쇄 표가 같은 순서를 쓴다. */
export function prFirst(items: readonly Contribution[]): Contribution[] {
  return [...items].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'pr' ? -1 : 1) || a.number - b.number);
}

export function tally(items: readonly Contribution[]): Tally {
  const prs = items.filter((c) => c.kind === 'pr');
  const issues = items.filter((c) => c.kind === 'issue');
  const openPrs = prs.filter((c) => c.state === 'open');
  return {
    repos: new Set(items.map((c) => c.repo)).size,
    issues: issues.length,
    prs: prs.length,
    merged: prs.filter((c) => c.state === 'merged').length,
    approved: openPrs.filter((c) => c.review === 'approved').length,
    changesRequested: openPrs.filter((c) => c.review === 'changes_requested').length,
    inReview: openPrs.length,
    closedPrs: prs.filter((c) => c.state === 'closed').length,
    resolvedIssues: issues.filter((c) => c.state === 'closed' && c.stateReason === 'completed').length,
    triagedIssues: issues.filter((c) => c.labels.includes('triaged')).length,
    openIssues: issues.filter((c) => c.state === 'open').length,
  };
}

/** 저장소별 묶음. 병합 많은 순, 항목 많은 순, 저장소 이름순으로 정렬한다. */
export function byRepo(items: readonly Contribution[]): RepoGroup[] {
  const groups = new Map<string, Contribution[]>();
  for (const c of items) {
    const list = groups.get(c.repo);
    if (list) list.push(c);
    else groups.set(c.repo, [c]);
  }
  return [...groups]
    .map(([repo, list]) => ({
      repo,
      items: list,
      tally: tally(list),
      tools: [...new Set(list.flatMap((c) => (c.project ? [c.project] : [])))],
    }))
    .sort((a, b) => b.tally.merged - a.tally.merged || b.items.length - a.items.length || a.repo.localeCompare(b.repo));
}
