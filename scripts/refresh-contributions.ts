// 외부 오픈소스 기여 상태를 GitHub(GraphQL)·PyPI에서 읽어 src/data/contributions.json을 갱신한다.
// 매일 .github/workflows/refresh-contributions.yml이 실행한다. 바뀐 것이 없으면 파일을 건드리지 않는다.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export type State = 'open' | 'merged' | 'closed';
export interface RelatedRef { repo: string; number: number; title?: string; state?: State; url?: string; author?: string }
export interface Item {
  repo: string; kind: 'pr' | 'issue'; number: number; title: string; state: State;
  stateReason: string | null; review: string | null; url: string; project: string | null;
  labels: string[]; createdAt: string; closedAt: string | null; mergedAt: string | null;
  note?: string; related: RelatedRef[];
}
/** 다른 개발자의 PR·이슈에 남긴 리뷰와 댓글. 사람이 관리하는 필드가 없어 매일 통째로 새로 쓴다. */
export interface Engagement {
  repo: string; kind: 'pr' | 'issue'; number: number; title: string; state: State; url: string;
  author: string; review: 'approved' | 'changes_requested' | 'commented' | null;
  comments: number; firstAt: string; lastAt: string; link: string;
}
export interface Data {
  asOf: string; author: string; excludeOwners: string[]; ignore: string[]; items: Item[]; engagements?: Engagement[];
  own: { asahi?: { mergedPrs: number; mineMergedPrs: number; url: string }; entail?: { pypiReleases: number; pypiLatest: string; url: string } };
}
export interface GqlNode {
  __typename: 'Issue' | 'PullRequest';
  number: number; url: string; title: string; state: string;
  stateReason?: string | null; merged?: boolean; mergedAt?: string | null;
  closedAt: string | null; createdAt: string; reviewDecision?: string | null;
  author?: { login: string } | null;
  repository: { nameWithOwner: string }; labels: { nodes: { name: string }[] };
}
/** 한 PR·이슈의 댓글(모든 사람)과 리뷰(작성자로 걸러 받지만 다시 거른다). */
export interface Thread {
  comments: { author: { login: string } | null; createdAt: string; url: string }[];
  reviews: { author: { login: string } | null; state: string; submittedAt: string | null; url: string }[];
}

const DATA_PATH = fileURLToPath(new URL('../src/data/contributions.json', import.meta.url));
export const key = (repo: string, number: number) => `${repo}#${number}`;
/** 문자 코드 순 비교. localeCompare는 실행 환경(윈도, GitHub의 리눅스)의 정렬 규칙에 따라 순서가 달라져 순서만 바뀐 커밋이 한 번 생길 수 있다. */
const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** 병합 판정: merged가 참이면 병합. PyTorch처럼 봇이 병합하고 PR을 닫는 저장소는 닫혔고 Merged 라벨이 있으면 병합으로 본다. */
export function prState(n: { state: string; merged?: boolean; labels: string[] }): State {
  if (n.merged || n.state === 'MERGED') return 'merged';
  if (n.state === 'CLOSED') return n.labels.includes('Merged') ? 'merged' : 'closed';
  return 'open';
}

/**
 * 사이트가 쓰는 라벨: Merged는 병합 판정(봇이 병합하는 PyTorch)에, triaged는 이슈의 분류 표시에 쓴다.
 * ciflow/*·merging 같은 나머지 라벨은 자주 바뀌어, 저장하면 보이는 변화 없이 매일 커밋과 배포가 생긴다.
 */
const KEPT_LABELS = new Set(['Merged', 'triaged']);

export function normalize(n: GqlNode): Omit<Item, 'project' | 'note' | 'related'> {
  const names = n.labels.nodes.map((l) => l.name);
  const isPr = n.__typename === 'PullRequest';
  // 병합 판정은 Merged 라벨로 하므로, 라벨을 거르기 전에 상태를 정한다.
  const state: State = isPr ? prState({ state: n.state, merged: n.merged, labels: names }) : n.state === 'OPEN' ? 'open' : 'closed';
  const labels = names.filter((l) => KEPT_LABELS.has(l)).sort();
  return {
    repo: n.repository.nameWithOwner,
    kind: isPr ? 'pr' : 'issue',
    number: n.number,
    title: n.title,
    state,
    stateReason: !isPr && state === 'closed' && n.stateReason ? n.stateReason.toLowerCase() : null,
    review: isPr && n.reviewDecision ? n.reviewDecision.toLowerCase() : null,
    url: n.url,
    labels,
    createdAt: n.createdAt,
    closedAt: n.closedAt,
    mergedAt: state === 'merged' ? (n.mergedAt ?? n.closedAt) : null,
  };
}

/** 기계 필드는 새 값으로 바꾸고, 사람이 관리하는 필드(project·note·related)는 그대로 둔다. 검색에서 빠진 기존 항목도 남긴다. */
export function mergeItems(existing: Item[], fresh: Omit<Item, 'project' | 'note' | 'related'>[], ignore: string[]): Item[] {
  const skip = new Set(ignore);
  const prev = new Map(existing.map((i) => [key(i.repo, i.number), i]));
  const out = new Map<string, Item>();
  for (const i of existing) if (!skip.has(key(i.repo, i.number))) out.set(key(i.repo, i.number), i);
  for (const f of fresh) {
    const k = key(f.repo, f.number);
    if (skip.has(k)) continue;
    const p = prev.get(k);
    out.set(k, { ...f, project: p?.project ?? null, ...(p?.note ? { note: p.note } : {}), related: p?.related ?? [] });
  }
  return [...out.values()].sort((a, b) => byCodePoint(a.repo, b.repo) || a.number - b.number);
}

/** 제출된 리뷰만 센다. PENDING은 아직 남에게 보이지 않는 초안이다. DISMISSED는 판정이 지워졌어도 리뷰한 사실은 남는다. */
const SUBMITTED = new Set(['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED']);
const DECISIVE = new Set(['APPROVED', 'CHANGES_REQUESTED']);

/**
 * 다른 개발자의 PR·이슈에 내가 남긴 리뷰와 댓글을 한 항목으로 줄인다. 내 것이 하나도 없으면 null이다.
 * 판정은 마지막 승인·변경 요청을 따르고, 의견만 남겼으면 commented다.
 * 링크는 판정을 담은 리뷰로, 판정이 없으면 마지막 리뷰로, 리뷰가 없으면 첫 댓글로 간다.
 */
export function toEngagement(n: GqlNode, thread: Thread, login: string): Engagement | null {
  const mine = (a: { login: string } | null) => a?.login.toLowerCase() === login.toLowerCase();
  const comments = thread.comments.filter((c) => mine(c.author)).sort((a, b) => byCodePoint(a.createdAt, b.createdAt));
  const reviews = thread.reviews
    .flatMap((r) => (mine(r.author) && SUBMITTED.has(r.state) && r.submittedAt ? [{ ...r, submittedAt: r.submittedAt }] : []))
    .sort((a, b) => byCodePoint(a.submittedAt, b.submittedAt));
  if (comments.length === 0 && reviews.length === 0) return null;
  const decisive = reviews.filter((r) => DECISIVE.has(r.state)).at(-1);
  const times = [...comments.map((c) => c.createdAt), ...reviews.map((r) => r.submittedAt)].sort(byCodePoint);
  const { repo, kind, number, title, state, url } = normalize(n);
  return {
    repo,
    kind,
    number,
    title,
    state,
    url,
    author: n.author?.login ?? 'ghost',
    review: decisive ? (decisive.state === 'APPROVED' ? 'approved' : 'changes_requested') : reviews.length > 0 ? 'commented' : null,
    comments: comments.length,
    firstAt: times[0],
    lastAt: times[times.length - 1],
    link: (decisive ?? reviews.at(-1))?.url ?? comments[0].url,
  };
}

/** 새로 찾은 값으로 바꾸고, 검색에서 빠진 기존 항목은 남긴다(검색 색인이 늦거나 흔들려도 목록이 줄지 않게). ignore는 양쪽에서 뺀다. */
export function mergeEngagements(existing: Engagement[], fresh: Engagement[], ignore: string[]): Engagement[] {
  const skip = new Set(ignore);
  const out = new Map<string, Engagement>();
  for (const e of [...existing, ...fresh]) if (!skip.has(key(e.repo, e.number))) out.set(key(e.repo, e.number), e);
  return [...out.values()].sort((a, b) => byCodePoint(a.repo, b.repo) || a.number - b.number);
}

export function sameContent(a: Data, b: Data): boolean {
  const strip = ({ asOf: _asOf, ...rest }: Data) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export function relatedQuery(refs: { repo: string; number: number }[]): string {
  const parts = refs.map((r, i) => {
    const [owner, name] = r.repo.split('/');
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { pullRequest(number: ${r.number}) { number url title state merged closedAt author { login } labels(first: 30) { nodes { name } } } }`;
  });
  return `query { ${parts.join(' ')} }`;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN 환경 변수가 없습니다');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'portfolio-refresh' },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: unknown; message?: string };
  if (!res.ok || body.errors || !body.data) {
    // 401·403·한도 초과는 message에, GraphQL 오류는 errors에 담겨 온다. 토큰과 헤더는 오류에 넣지 않는다.
    const detail = [body.message, body.errors ? JSON.stringify(body.errors) : null].filter(Boolean).join(' ');
    throw new Error(`GitHub GraphQL 실패(${res.status}): ${detail || '응답에 설명이 없습니다'}`);
  }
  return body.data;
}

const NODE_FIELDS = `__typename
  ... on Issue { number url title state stateReason createdAt closedAt author { login } repository { nameWithOwner } labels(first: 30) { nodes { name } } }
  ... on PullRequest { number url title state merged mergedAt closedAt createdAt reviewDecision author { login } repository { nameWithOwner } labels(first: 30) { nodes { name } } }`;

/** filter(author:·reviewed-by:·commenter: 등)로 PR·이슈를 찾는다. */
async function search(filter: string, author: string, excludeOwners: string[]): Promise<GqlNode[]> {
  // 공개 저장소만 읽는다. 개인 토큰(repo 범위)으로 로컬에서 돌려도 비공개 저장소의 제목과 주소가 공개 JSON에 들어가지 않게 한다.
  // 작성자 본인의 저장소(-user)와 제외 소유자(동아리 조직 등)의 저장소(-org)는 검색에서 뺀다.
  const orgs = excludeOwners.filter((o) => o.toLowerCase() !== author.toLowerCase());
  const q = [filter, `-user:${author}`, 'is:public', ...orgs.map((o) => `-org:${o}`)].join(' ');
  const nodes: GqlNode[] = [];
  let after: string | null = null;
  do {
    const data: { search: { nodes: GqlNode[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } = await gql(
      `query($q: String!, $after: String) { search(query: $q, type: ISSUE, first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { ${NODE_FIELDS} } } }`,
      { q, after },
    );
    nodes.push(...data.search.nodes);
    after = data.search.pageInfo.hasNextPage ? data.search.pageInfo.endCursor : null;
  } while (after);
  const owners = new Set(excludeOwners.map((o) => o.toLowerCase()));
  return nodes.filter((n) => n.repository && !owners.has(n.repository.nameWithOwner.split('/')[0].toLowerCase()));
}

const THREAD_QUERY = `query($owner: String!, $name: String!, $number: Int!, $login: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      ... on Issue { comments(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { author { login } createdAt url } } }
      ... on PullRequest {
        comments(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { author { login } createdAt url } }
        reviews(first: 100, author: $login) { nodes { author { login } state submittedAt url } }
      }
    }
  }
}`;

/** 한 PR·이슈의 댓글을 끝까지 읽고, 내 리뷰를 함께 읽는다. */
async function threadOf(repo: string, number: number, login: string): Promise<Thread> {
  const [owner, name] = repo.split('/');
  const thread: Thread = { comments: [], reviews: [] };
  let after: string | null = null;
  do {
    type Page = { comments: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Thread['comments'] }; reviews?: { nodes: Thread['reviews'] } };
    const data: { repository: { issueOrPullRequest: Page | null } | null } = await gql(THREAD_QUERY, { owner, name, number, login, after });
    const page = data.repository?.issueOrPullRequest;
    if (!page) throw new Error(`참여한 ${key(repo, number)}을 찾지 못했습니다`);
    thread.comments.push(...page.comments.nodes);
    if (after === null) thread.reviews.push(...(page.reviews?.nodes ?? []));
    after = page.comments.pageInfo.hasNextPage ? page.comments.pageInfo.endCursor : null;
  } while (after);
  return thread;
}

/** 다른 개발자의 PR 중 내가 리뷰한 것과, PR·이슈 중 내가 댓글을 단 것. 두 검색에 모두 걸린 항목은 한 번만 읽는다. */
async function collectEngagements(author: string, excludeOwners: string[]): Promise<Engagement[]> {
  const found = new Map<string, GqlNode>();
  for (const role of ['reviewed-by', 'commenter']) {
    for (const n of await search(`${role}:${author} -author:${author}`, author, excludeOwners)) {
      found.set(key(n.repository.nameWithOwner, n.number), n);
    }
  }
  const out: Engagement[] = [];
  for (const n of found.values()) {
    const e = toEngagement(n, await threadOf(n.repository.nameWithOwner, n.number, author), author);
    if (e) out.push(e);
  }
  return out;
}

async function refreshRelated(items: Item[]): Promise<void> {
  const refs = items.flatMap((i) => i.related);
  if (refs.length === 0) return;
  const data = await gql<Record<string, { pullRequest: { number: number; url: string; title: string; state: string; merged: boolean; author: { login: string } | null; labels: { nodes: { name: string }[] } } | null }>>(relatedQuery(refs));
  refs.forEach((r, idx) => {
    const pr = data[`r${idx}`]?.pullRequest;
    if (!pr) throw new Error(`관련 PR ${key(r.repo, r.number)}을 찾지 못했습니다`);
    Object.assign(r, { title: pr.title, url: pr.url, author: pr.author?.login ?? 'ghost', state: prState({ state: pr.state, merged: pr.merged, labels: pr.labels.nodes.map((l) => l.name) }) });
  });
}

async function ownStats(author: string): Promise<Data['own']> {
  let mine = 0;
  let total = 0;
  let after: string | null = null;
  do {
    const data: { repository: { pullRequests: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { author: { login: string } | null }[] } } } = await gql(
      `query($after: String) { repository(owner: "semicollon-club", name: "asahi") { pullRequests(states: MERGED, baseRefName: "main", first: 100, after: $after) { totalCount pageInfo { hasNextPage endCursor } nodes { author { login } } } } }`,
      { after },
    );
    const prs = data.repository.pullRequests;
    total = prs.totalCount;
    mine += prs.nodes.filter((n) => n.author?.login === author).length;
    after = prs.pageInfo.hasNextPage ? prs.pageInfo.endCursor : null;
  } while (after);
  const res = await fetch('https://pypi.org/pypi/entail-ai/json', { headers: { 'user-agent': 'portfolio-refresh' } });
  if (!res.ok) throw new Error(`PyPI 실패(${res.status})`);
  const pypi = (await res.json()) as { info: { version: string }; releases: Record<string, { yanked: boolean }[]> };
  const releases = Object.values(pypi.releases).filter((files) => files.length > 0 && !files.every((f) => f.yanked)).length;
  return {
    asahi: { mergedPrs: total, mineMergedPrs: mine, url: 'https://github.com/semicollon-club/asahi/pulls?q=is%3Apr+is%3Amerged+base%3Amain' },
    entail: { pypiReleases: releases, pypiLatest: pypi.info.version, url: 'https://pypi.org/project/entail-ai/' },
  };
}

export async function main(path = DATA_PATH): Promise<boolean> {
  const text = await readFile(path, 'utf8');
  const data = JSON.parse(text) as Data;
  // mergeItems는 기존 related 객체를 그대로 넘기고 refreshRelated가 그것을 제자리에서 바꾼다. 비교할 원본은 따로 읽어 둔다.
  const original = JSON.parse(text) as Data;
  const fresh = (await search(`author:${data.author}`, data.author, data.excludeOwners)).map(normalize);
  const items = mergeItems(data.items, fresh, data.ignore);
  await refreshRelated(items);
  const engagements = mergeEngagements(data.engagements ?? [], await collectEngagements(data.author, data.excludeOwners), data.ignore);
  // 키 순서를 고정한다. 펼쳐 쓰면 처음 생긴 engagements가 own 뒤로 간다.
  const { asOf, author, excludeOwners, ignore } = data;
  const next: Data = { asOf, author, excludeOwners, ignore, items, engagements, own: await ownStats(data.author) };
  if (sameContent(original, next)) {
    console.log('변경 없음');
    return false;
  }
  next.asOf = new Date().toISOString();
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`갱신함: 항목 ${items.length}개, 참여 ${engagements.length}개`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
