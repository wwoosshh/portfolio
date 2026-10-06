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
  openPrs: number;
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

/** 문자 코드 순 비교. localeCompare는 실행 환경(윈도, 리눅스)의 정렬 규칙에 따라 순서가 달라진다. */
const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const SHORT_NAMES = new Map([
  ['pytorch/pytorch', 'PyTorch'],
  ['vllm-project/vllm', 'vLLM'],
  ['sgl-project/sglang', 'SGLang'],
  ['Comfy-Org/ComfyUI', 'ComfyUI'],
]);

export function shortRepo(repo: string): string {
  return SHORT_NAMES.get(repo) ?? repo.split('/')[1] ?? repo;
}

/**
 * 보여 줄 우선순위. 작을수록 먼저다.
 * 0 병합 PR · 1 승인된 열린 PR · 2 결정 없는 열린 PR(리뷰 중) · 3 변경 요청 PR · 4 해결된 이슈 · 5 열린 이슈 · 6 닫힌 PR · 7 그 밖의 닫힌 이슈.
 * 병합 칩 도장이 화면 안에서 찍히려면 병합 PR이 묶음의 맨 위에 있어야 한다.
 */
export function contributionPriority(c: Contribution): number {
  if (c.kind === 'pr') {
    if (c.state === 'merged') return 0;
    if (c.state === 'closed') return 6;
    if (c.review === 'approved') return 1;
    return c.review === 'changes_requested' ? 3 : 2;
  }
  if (c.state === 'closed') return c.stateReason === 'completed' ? 4 : 7;
  return 5;
}

/** 우선순위 순, 같은 순위에서는 번호가 큰(최근) 것부터. 홈의 보드와 인쇄 표가 같은 순서를 쓴다. 원본은 바꾸지 않는다. */
export function sortByPriority(items: readonly Contribution[]): Contribution[] {
  return [...items].sort((a, b) => contributionPriority(a) - contributionPriority(b) || b.number - a.number);
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
    openPrs: openPrs.length,
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
    .sort((a, b) => b.tally.merged - a.tally.merged || b.items.length - a.items.length || byCodePoint(a.repo, b.repo));
}

/**
 * 인쇄 표에 실을 줄. 표가 길어져 PDF가 4쪽을 넘지 않도록 cap줄까지만 싣되, 한 저장소가 자리를 다 차지하지 않게 한다.
 * 먼저 저장소마다 우선순위가 가장 높은 항목 하나를 싣고(저장소가 cap보다 많아도 이 보장은 지킨다), 남은 자리는 전체를 우선순위 순으로 채운다.
 * 내보내는 순서는 저장소 묶음 순서(byRepo)이고, 묶음 안에서는 우선순위 순이다. rest는 싣지 못한 항목 수다.
 */
export function printRows(items: readonly Contribution[], cap = 16): { rows: Contribution[]; rest: number } {
  const groups = byRepo(items);
  const chosen = new Set<Contribution>(groups.map((g) => sortByPriority(g.items)[0]));
  for (const c of sortByPriority(items)) {
    if (chosen.size >= cap) break;
    chosen.add(c);
  }
  const rows = groups.flatMap((g) => sortByPriority(g.items).filter((c) => chosen.has(c)));
  return { rows, rest: items.length - rows.length };
}
