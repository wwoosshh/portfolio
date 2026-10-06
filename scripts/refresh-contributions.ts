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
export interface Data {
  asOf: string; author: string; excludeOwners: string[]; ignore: string[]; items: Item[];
  own: { asahi?: { mergedPrs: number; mineMergedPrs: number; url: string }; entail?: { pypiReleases: number; pypiLatest: string; url: string } };
}
export interface GqlNode {
  __typename: 'Issue' | 'PullRequest';
  number: number; url: string; title: string; state: string;
  stateReason?: string | null; merged?: boolean; mergedAt?: string | null;
  closedAt: string | null; createdAt: string; reviewDecision?: string | null;
  repository: { nameWithOwner: string }; labels: { nodes: { name: string }[] };
}

const DATA_PATH = fileURLToPath(new URL('../src/data/contributions.json', import.meta.url));
export const key = (repo: string, number: number) => `${repo}#${number}`;

/** 병합 판정: merged가 참이면 병합. PyTorch처럼 봇이 병합하고 PR을 닫는 저장소는 닫혔고 Merged 라벨이 있으면 병합으로 본다. */
export function prState(n: { state: string; merged?: boolean; labels: string[] }): State {
  if (n.merged || n.state === 'MERGED') return 'merged';
  if (n.state === 'CLOSED') return n.labels.includes('Merged') ? 'merged' : 'closed';
  return 'open';
}

export function normalize(n: GqlNode): Omit<Item, 'project' | 'note' | 'related'> {
  const labels = n.labels.nodes.map((l) => l.name).sort();
  const isPr = n.__typename === 'PullRequest';
  const state: State = isPr ? prState({ state: n.state, merged: n.merged, labels }) : n.state === 'OPEN' ? 'open' : 'closed';
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
  return [...out.values()].sort((a, b) => a.repo.localeCompare(b.repo) || a.number - b.number);
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
  const body = (await res.json()) as { data?: T; errors?: unknown };
  if (!res.ok || body.errors || !body.data) throw new Error(`GitHub GraphQL 실패(${res.status}): ${JSON.stringify(body.errors ?? null)}`);
  return body.data;
}

const NODE_FIELDS = `__typename
  ... on Issue { number url title state stateReason createdAt closedAt repository { nameWithOwner } labels(first: 30) { nodes { name } } }
  ... on PullRequest { number url title state merged mergedAt closedAt createdAt reviewDecision repository { nameWithOwner } labels(first: 30) { nodes { name } } }`;

async function searchAll(author: string, excludeOwners: string[]): Promise<GqlNode[]> {
  const q = `author:${author} -user:${author}`;
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
  const fresh = (await searchAll(data.author, data.excludeOwners)).map(normalize);
  const items = mergeItems(data.items, fresh, data.ignore);
  await refreshRelated(items);
  const next: Data = { ...data, items, own: await ownStats(data.author) };
  if (sameContent(original, next)) {
    console.log('변경 없음');
    return false;
  }
  next.asOf = new Date().toISOString();
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`갱신함: 항목 ${items.length}개`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
