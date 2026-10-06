import { byRepo, shortRepo, tally } from './contribution-stats';
import type { Contributions, Metric, Project } from './schema';

// 상태가 바뀌는 프로젝트 수치는 MDX에 적지 않고 기여 데이터에서 계산한다(설계 2026-10-06 §4).
const FUZZER = 'torch-compile-fuzzer';
const PYTORCH = 'pytorch/pytorch';
const EXTERNAL_SEARCH =
  'https://github.com/search?q=author%3Awwoosshh+-user%3Awwoosshh+-org%3Asemicollon-club&type=issues';

export function liveMetrics(projectId: string, data: Contributions): Metric[] {
  if (projectId === FUZZER) {
    const t = tally(data.items.filter((c) => c.project === FUZZER && c.repo === PYTORCH));
    return [
      {
        label: 'PyTorch 이슈',
        value: `${t.issues}건 · 분류 ${t.triagedIssues} · 해결 ${t.resolvedIssues}`,
        evidence: 'https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh',
        status: 'ok',
      },
      {
        label: 'PyTorch 수정 PR',
        value: `병합 ${t.merged} · 리뷰 중 ${t.inReview} · 닫힘 ${t.closedPrs}`,
        evidence: 'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh',
        status: t.merged > 0 ? 'ok' : 'wait',
      },
    ];
  }

  if (projectId === 'entail') {
    const items = data.items.filter((c) => c.project === 'entail');
    const t = tally(items);
    const repos = byRepo(items).map((g) => shortRepo(g.repo));
    const metrics: Metric[] = [
      {
        label: `외부 이슈 (${repos.join('·')})`,
        value: `${t.issues}건 · 열림 ${t.openIssues}`,
        evidence: EXTERNAL_SEARCH,
        status: 'wait',
      },
    ];
    const prs = items.flatMap((c) => c.related);
    if (prs.length > 0) {
      const count = (state: 'open' | 'merged' | 'closed') => prs.filter((r) => r.state === state).length;
      const [open, merged, closed] = [count('open'), count('merged'), count('closed')];
      metrics.push({
        label: '다른 개발자의 수정 PR',
        value: `열림 ${open} · 병합 ${merged} · 닫힘 ${closed}`,
        evidence: prs[0].url,
        status: merged > 0 ? 'ok' : open > 0 ? 'wait' : 'off',
      });
    }
    metrics.push({
      label: 'PyPI 릴리스',
      value: `${data.own.entail.pypiReleases}개 (최신 ${data.own.entail.pypiLatest})`,
      evidence: data.own.entail.url,
      status: 'ok',
    });
    return metrics;
  }

  if (projectId === 'asahi') {
    const { mergedPrs: total, mineMergedPrs: mine, url } = data.own.asahi;
    return [
      {
        label: `main에 병합된 PR (제 계정 ${mine}건 + 다른 계정 ${total - mine}건)`,
        value: `${total}건`,
        evidence: url,
        status: 'ok',
      },
    ];
  }

  return [];
}

/** 계산한 수치를 앞에 두고, 프런트매터에 적은 수치(상태가 바뀌지 않는 값)를 뒤에 붙인다. */
export function metricsOf(entry: { id: string; data: Pick<Project, 'metrics'> }, data: Contributions): Metric[] {
  return [...liveMetrics(entry.id, data), ...entry.data.metrics];
}
