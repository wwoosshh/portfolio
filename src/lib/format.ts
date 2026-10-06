export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${year}.${month}`;
}

export function formatPeriod(period: { start: string; end?: string }): string {
  if (!period.end) return `${formatYearMonth(period.start)} – 현재`;
  if (period.end === period.start) return formatYearMonth(period.start);
  return `${formatYearMonth(period.start)} – ${formatYearMonth(period.end)}`;
}

// 날짜는 한국 시간(Asia/Seoul, UTC+9, 일광절약 없음) 기준으로 적는다. 갱신이 06:00 KST(전날 21:00 UTC)에 돌므로
// UTC로 적으면 "마지막 변경"이 하루 전 날짜로 보인다. 날짜만 적힌 값(UTC 자정)은 09:00 KST라 같은 날이다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function formatDate(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function shortRef(url: string): string {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (host === 'github.com') {
    const [owner, repo, kind, ...rest] = parts;
    if (!repo) return owner ?? host;
    if ((kind === 'pull' || kind === 'issues') && rest[0]) return `${repo}#${rest[0]}`;
    if (kind === 'commit' && rest[0]) return `${repo}@${rest[0].slice(0, 7)}`;
    if (kind === 'actions') return `${repo} CI`;
    if (kind === 'deployments') return `${repo} 배포 기록`;
    if (kind === 'pulls') return `${repo} PR 목록`;
    if (kind === 'issues') return `${repo} 이슈 목록`;
    if ((kind === 'blob' || kind === 'tree') && rest.length > 1) return `${repo}/${rest.slice(1).join('/')}`;
    return `${owner}/${repo}`;
  }
  if (host === 'api.github.com') {
    const [root, , repo, kind] = parts;
    if (root === 'repos' && repo && kind === 'deployments') return `${repo} 배포 기록`;
  }
  if (host === 'pypi.org' && parts[0] === 'project' && parts[1]) return `pypi:${parts[1]}`;
  return host;
}
