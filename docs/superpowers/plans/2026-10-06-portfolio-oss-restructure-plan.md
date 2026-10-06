# 오픈소스 기여 중심 구조 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the home page into two chapters, 오픈소스 and 개인 프로젝트, and keep contribution status current by refreshing it automatically every day.

**Architecture:**
- One data file, `src/data/contributions.json`, holds two kinds of fields:
  - human-owned fields: `project`, `note`, `related`, `ignore`;
  - machine-owned fields, refreshed daily by `scripts/refresh-contributions.ts`, which reads GitHub GraphQL and PyPI from a GitHub Actions job.
- When the data changes, the job commits it and Vercel redeploys.
- Every number and status phrase is computed from that data:
  - `src/lib/contribution-stats.ts` computes the counts;
  - `src/lib/live-metrics.ts` builds the status-based project metrics;
  - `src/data/profile.ts` builds the computed intro and highlights.
- The home page gets a new contribution-board scene and regroups the featured projects by a new `group` frontmatter field.

**Tech Stack:** Astro 7, MDX, Zod 4 (`astro/zod`), GSAP 3.15.0, Vitest, Playwright, GitHub Actions, Node 22 (`--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-10-06-portfolio-oss-restructure-design.md`

## Global Constraints

- All Plan 1 rules still hold.
  - **Tokens and style:** colours come only from `tokens.css`. No shadows. Radius is `var(--r-sm)`, `var(--r-md)` or `50%`. Gradients live only in `global.css`. CSS transitions use motion tokens only. `color: var(--blue)` is never used for text.
  - **Motion:** scenes reveal with `opacity`, never `autoAlpha`. A scene plays once only through `playOnEnter` (no `once:` in `src/motion/scenes/*.ts`; the scene-rules test enforces this). Every scene works in the `full`, `lite` and `static` modes.
  - **Visibility:** without JS, and under reduced motion, every element is visible.
  - **Links:** new-tab links carry `rel="noopener noreferrer"` and `↗`. A visible space between an element and an expression across lines is written `{' '}`.
  - **Privacy:** no phone number and no personal e-mail anywhere in the repo, build or public PDF. The public contact is nunconnect1@gmail.com. `foodiemap-backend` is never linked.
  - **Print:** the print page loads no script and stays at 4 A4 pages or fewer.
  - **Commits:** every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.
- Exception: automated data commits made by the refresh workflow (`github-actions[bot]`) carry no trailer.
- Tokens are never printed or written to a file. The refresh script reads `GITHUB_TOKEN` from the environment only. Run it locally as `GITHUB_TOKEN=$(gh auth token) node --experimental-strip-types scripts/refresh-contributions.ts`, and never `echo` the token.
- E2E tests that depend on contribution data read their expected values from `src/data/contributions.json`, because the data changes daily. Never hard-code counts.
- Wording:
  - The PyTorch title is "PyTorch 기여자 · 병합 N건". N is always computed and always shown.
  - Status words are 병합됨, 승인 · 병합 대기, 리뷰 중, 변경 요청, 닫힘, 해결됨, 분류됨, 열림, 리뷰 대기 (for related PRs).

---

### Task 1: Contribution data pipeline (schema, data, refresh script, stats, daily workflow)

**Files:**
- Modify: `src/lib/schema.ts` (contribution schemas)
- Create: `src/data/contributions.json`; Modify: `src/data/contributions.ts` (it now loads the JSON)
- Modify: `src/lib/integrity.ts` (`project` may be `null`; `ignore` check)
- Create: `scripts/refresh-contributions.ts`, `src/lib/contributions-refresh.test.ts`
- Create: `src/lib/contribution-stats.ts`, `src/lib/contribution-stats.test.ts`
- Create: `.github/workflows/refresh-contributions.yml`
- Modify: existing tests that build contribution fixtures (`src/lib/schema.test.ts`, `src/lib/integrity.test.ts` if present, and any test importing `contributions`)

**Interfaces (produced):**
- `Contribution` gains these fields:
  - `stateReason: 'completed'|'not_planned'|'reopened'|'duplicate'|null`
  - `review: 'approved'|'changes_requested'|'review_required'|null`
  - `createdAt: string`, `closedAt: string|null`, `mergedAt: string|null`
  - `project: string|null`
  - `related: { repo, number, title, state, url, author }[]`
- `Contributions` is `{ asOf: Date; author; excludeOwners: string[]; ignore: string[]; items; own: { asahi: { mergedPrs, mineMergedPrs, url }, entail: { pypiReleases, pypiLatest, url } } }`.
- `contribution-stats.ts` exports:
  - `tally(items): Tally`, where `Tally = { repos, issues, prs, merged, approved, changesRequested, inReview, closedPrs, resolvedIssues, triagedIssues, openIssues }` (`inReview` counts every open PR, approved ones included);
  - `byRepo(items): RepoGroup[]`, where `RepoGroup = { repo, items, tally, tools: string[] }` and the order is merged desc, then item count desc, then repo asc;
  - `shortRepo(repo)`.

- [ ] **Step 1: Schema.** In `src/lib/schema.ts`, replace `contributionSchema` and `contributionsSchema` with the following. Keep `httpUrl` and the existing exports.

```ts
const repoName = z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식이어야 합니다');
const contributionStateSchema = z.enum(['open', 'merged', 'closed']);

const relatedPrSchema = z.strictObject({
  repo: repoName,
  number: z.number().int().positive(),
  title: z.string().min(1),
  state: contributionStateSchema,
  url: httpUrl,
  author: z.string().min(1),
});

export const contributionSchema = z
  .strictObject({
    repo: repoName,
    kind: z.enum(['pr', 'issue']),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: contributionStateSchema,
    stateReason: z.enum(['completed', 'not_planned', 'reopened', 'duplicate']).nullable().default(null),
    review: z.enum(['approved', 'changes_requested', 'review_required']).nullable().default(null),
    url: httpUrl,
    // 이 기여를 찾은 도구(대표작 id). 자동으로 새로 찾은 항목은 null이다.
    project: z.string().min(1).nullable(),
    labels: z.array(z.string()).default([]),
    createdAt: z.iso.datetime(),
    closedAt: z.iso.datetime().nullable().default(null),
    mergedAt: z.iso.datetime().nullable().default(null),
    note: z.string().min(1).optional(),
    related: z.array(relatedPrSchema).default([]),
  })
  .superRefine((c, ctx) => {
    if (c.kind === 'issue' && c.state === 'merged') {
      ctx.addIssue({ code: 'custom', path: ['state'], message: '이슈는 merged 상태일 수 없습니다' });
    }
    if (c.kind === 'issue' && c.review !== null) {
      ctx.addIssue({ code: 'custom', path: ['review'], message: '이슈에는 리뷰 상태가 없습니다' });
    }
    if (c.state === 'merged' && c.mergedAt === null) {
      ctx.addIssue({ code: 'custom', path: ['mergedAt'], message: '병합된 PR은 mergedAt이 있어야 합니다' });
    }
    const expected = `https://github.com/${c.repo}/${c.kind === 'pr' ? 'pull' : 'issues'}/${c.number}`;
    if (c.url !== expected) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: `URL은 ${expected} 이어야 합니다` });
    }
  });

export const contributionsSchema = z.strictObject({
  // 마지막으로 내용이 바뀐 시각. 매일 확인하지만 바뀐 것이 없으면 그대로다.
  asOf: z.coerce.date(),
  author: z.string().min(1),
  excludeOwners: z.array(z.string().min(1)).default([]),
  ignore: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+#\d+$/)).default([]),
  items: z.array(contributionSchema),
  own: z.strictObject({
    asahi: z.strictObject({
      mergedPrs: z.number().int().nonnegative(),
      mineMergedPrs: z.number().int().nonnegative(),
      url: httpUrl,
    }),
    entail: z.strictObject({
      pypiReleases: z.number().int().positive(),
      pypiLatest: z.string().min(1),
      url: httpUrl,
    }),
  }),
});
```

- [ ] **Step 2: Seed the JSON.** Create `src/data/contributions.json` as a seed that holds only the human-owned fields. The script fills in the rest in Step 6.

```json
{
  "asOf": "2026-09-30T00:00:00Z",
  "author": "wwoosshh",
  "excludeOwners": ["wwoosshh", "semicollon-club"],
  "ignore": [],
  "items": [
    { "repo": "vllm-project/vllm", "kind": "issue", "number": 58675, "project": "entail", "related": [{ "repo": "vllm-project/vllm", "number": 58679 }] },
    { "repo": "sgl-project/sglang", "kind": "issue", "number": 41227, "project": "entail", "related": [{ "repo": "sgl-project/sglang", "number": 41239 }, { "repo": "sgl-project/sglang", "number": 41327 }] },
    { "repo": "Comfy-Org/ComfyUI", "kind": "issue", "number": 16490, "project": "entail", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198094, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198095, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198100, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198101, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198102, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "issue", "number": 198131, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198096, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198097, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198103, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198104, "project": "torch-compile-fuzzer", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198105, "project": "torch-compile-fuzzer", "note": "이슈에서 먼저 논의하라는 절차 안내", "related": [] },
    { "repo": "pytorch/pytorch", "kind": "pr", "number": 198132, "project": "torch-compile-fuzzer", "related": [] }
  ],
  "own": {}
}
```

Replace the body of `src/data/contributions.ts` with:

```ts
import { contributionsSchema } from '../lib/schema';
import raw from './contributions.json';

// 매일 GitHub Actions(scripts/refresh-contributions.ts)가 상태를 갱신한다(설계 2026-10-06 §4).
// 사람이 관리하는 필드는 project·note·related(번호)·ignore·excludeOwners뿐이다.
export const contributions = contributionsSchema.parse(raw);
```

- [ ] **Step 3: Write the failing tests.**
  - Create `src/lib/contributions-refresh.test.ts`. It must cover:
    - `prState`:
      - `merged: true` gives `merged`;
      - `CLOSED` with the `Merged` label gives `merged`;
      - `CLOSED` without it gives `closed`;
      - `OPEN` gives `open`.
    - `normalize`:
      - a closed issue gives `stateReason: 'completed'`;
      - an open issue gives `stateReason: null`;
      - a PR gives `review: 'changes_requested'`;
      - a PyTorch-style merged PR gets `mergedAt` set to `closedAt`;
      - labels come out sorted.
    - `mergeItems`:
      - it keeps `project`, `note` and `related` from the existing item;
      - a new item gets `project: null` and `related: []`;
      - `ignore` drops matching items from both sides;
      - an existing item missing from the fresh results is kept unchanged.
    - `sameContent`: it ignores `asOf` and detects any other change.
    - `relatedQuery`: it builds aliases `r0`, `r1`, … with JSON-quoted owner and name.
  - Create `src/lib/contribution-stats.test.ts` covering:
    - `tally` on a mixed fixture: issues, PRs, merged, approved, changes requested, closed, resolved and triaged;
    - `byRepo` ordering and `tools` collection (distinct, non-null `project` values);
    - `shortRepo('pytorch/pytorch') === 'PyTorch'`, `'vllm-project/vllm' → 'vLLM'`, `'sgl-project/sglang' → 'SGLang'` and `'Comfy-Org/ComfyUI' → 'ComfyUI'`, with a fallback to the repo name part.
  - Run `npx vitest run src/lib/contributions-refresh.test.ts src/lib/contribution-stats.test.ts`. Expected: FAIL, because the modules are missing.

- [ ] **Step 4: Refresh script.** Create `scripts/refresh-contributions.ts`.
  - It uses only built-ins (`fetch`, `node:fs/promises`, `node:url`), so Node can run it with `--experimental-strip-types`.
  - Every exported pure function below is required.
  - `main()` runs only when the file is executed directly.

```ts
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
  const data = JSON.parse(await readFile(path, 'utf8')) as Data;
  const fresh = (await searchAll(data.author, data.excludeOwners)).map(normalize);
  const items = mergeItems(data.items, fresh, data.ignore);
  await refreshRelated(items);
  const next: Data = { ...data, items, own: await ownStats(data.author) };
  if (sameContent(data, next)) {
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
```

  - Keep the key order of the written JSON stable (`asOf, author, excludeOwners, ignore, items, own`), so that diffs stay small.

- [ ] **Step 5: Stats module.** Create `src/lib/contribution-stats.ts` with `tally`, `byRepo` and `shortRepo` as described under Interfaces. Use these definitions:
  - `inReview`: PRs with `state === 'open'`.
  - `approved`: open PRs with `review === 'approved'`.
  - `changesRequested`: open PRs with `review === 'changes_requested'`.
  - `closedPrs`: PRs with `state === 'closed'`.
  - `resolvedIssues`: issues with `state === 'closed'` and `stateReason === 'completed'`.
  - `triagedIssues`: issues whose labels include `triaged`.
  - `openIssues`: issues with `state === 'open'`.
  - `repos`: distinct repo count.
  - `shortRepo` table: `{ 'pytorch/pytorch': 'PyTorch', 'vllm-project/vllm': 'vLLM', 'sgl-project/sglang': 'SGLang', 'Comfy-Org/ComfyUI': 'ComfyUI' }`. For any other repo, fall back to the part after `/`.

  Run the Step 3 tests. Expected: PASS.

- [ ] **Step 6: First real refresh.**
  - Run `GITHUB_TOKEN=$(gh auth token) node --experimental-strip-types scripts/refresh-contributions.ts`. Expected output: `갱신함: 항목 15개`, or more if new contributions exist.
  - Open the JSON and check the following, then record what you saw:
    - `pytorch/pytorch#198132` is `merged` with a `mergedAt`.
    - `#198131` is `closed`/`completed`.
    - `#198105` is `closed` and kept its note.
    - `sglang#41227.related` shows both PRs `closed`.
    - `own.entail` is about 19 releases (latest 2.4.0).
    - `own.asahi.mergedPrs` is about 81.
  - Run the script again. Expected: `변경 없음`, unless something changed upstream in between.

- [ ] **Step 7: Integrity.**
  - In `src/lib/integrity.ts`, skip the featured-project check when `c.project === null`.
  - Add an error when an item's key is listed in the `ignore` array. Pass `ignore` in through `IntegrityInput` and from `loadSite`.
  - Update any fixtures in tests that build contributions so they match the new schema.
  - Run `npx vitest run && npx astro check`. Expected: PASS and 0 errors.

- [ ] **Step 8: Daily workflow.** Create `.github/workflows/refresh-contributions.yml`:

```yaml
name: refresh-contributions
# 매일 06:00(KST)에 외부 오픈소스 기여 상태를 갱신한다. 바뀐 것이 있으면 main에 커밋하고, 그 푸시로 Vercel이 배포한다.
on:
  schedule:
    - cron: '0 21 * * *'
  workflow_dispatch:
permissions:
  contents: write
concurrency:
  group: refresh-contributions
  cancel-in-progress: false
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Refresh contribution data
        run: node --experimental-strip-types scripts/refresh-contributions.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Validate (unit tests + build)
        run: npm test && npm run build
      - name: Commit if changed
        run: |
          git add src/data/contributions.json
          if git diff --cached --quiet; then echo "변경 없음"; exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "chore(data): 오픈소스 기여 상태 자동 갱신"
          git push
```

- [ ] **Step 9: Commit.**

```bash
git add src/lib/schema.ts src/data/contributions.json src/data/contributions.ts src/lib/integrity.ts scripts/refresh-contributions.ts src/lib/contributions-refresh.test.ts src/lib/contribution-stats.ts src/lib/contribution-stats.test.ts .github/workflows/refresh-contributions.yml <updated test files>
git commit -m "feat: 오픈소스 기여 데이터를 매일 GitHub·PyPI에서 자동 갱신" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Computed wording and live metrics (no stale status anywhere)

**Files:**
- Modify: `src/lib/status.ts` (new status words, `relatedStatus`)
- Create: `src/lib/live-metrics.ts`, `src/lib/live-metrics.test.ts`
- Modify: `src/data/profile.ts` (computed intro sentence and highlights 1, 2 and 4)
- Modify: `src/content/projects/torch-compile-fuzzer.mdx`, `entail.mdx`, `asahi.mdx` (remove status metrics; reword status claims in the body)
- Modify: every metric consumer, so it uses `metricsOf()`: `ProjectScene.astro`, `BuildDeck.astro`, `ProjectBrief.astro`, `ProjectCard.astro`, `src/pages/projects/[id].astro`
- Modify: `src/components/ContributionList.astro` (header text, related PRs)
- Modify: tests that assert the old status words (search for `머지됨`, `리뷰 중`, `분류됨`)

- [ ] **Step 1: Status words.** In `src/lib/status.ts`, replace `contributionStatus` and add `relatedStatus`:

```ts
export function contributionStatus(
  c: Pick<Contribution, 'kind' | 'state' | 'stateReason' | 'review' | 'labels' | 'note'>,
): StatusView {
  if (c.kind === 'pr') {
    if (c.state === 'merged') return view('ok', '병합됨');
    if (c.state === 'closed') return view('off', c.note ? `닫힘 · ${c.note}` : '닫힘');
    if (c.review === 'approved') return view('ok', '승인 · 병합 대기');
    if (c.review === 'changes_requested') return view('wait', '변경 요청');
    return view('wait', '리뷰 중');
  }
  if (c.state === 'closed') return c.stateReason === 'completed' ? view('ok', '해결됨') : view('off', '닫힘');
  return c.labels.includes('triaged') ? view('ok', '분류됨') : view('wait', '열림');
}

export function relatedStatus(r: { state: 'open' | 'merged' | 'closed' }): StatusView {
  if (r.state === 'merged') return view('ok', '병합됨');
  if (r.state === 'closed') return view('off', '닫힘');
  return view('wait', '리뷰 대기');
}
```

- [ ] **Step 2: Live metrics (test first).** `src/lib/live-metrics.ts` exports:
  - `liveMetrics(projectId, data: Contributions): Metric[]`, where `Metric = z.infer<typeof metricSchema>` (export that type from `schema.ts` if it isn't exported yet);
  - `metricsOf(entry: ProjectEntry, data): Metric[]`, which returns `[...liveMetrics(entry.id, data), ...entry.data.metrics]`.

  Rules:
  - `torch-compile-fuzzer`: use the items whose `project` is this id and whose repo is `pytorch/pytorch`.
    - `{ label: 'PyTorch 이슈', value: `${issues}건 · 분류 ${triagedIssues} · 해결 ${resolvedIssues}`, evidence: 'https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh', status: 'ok' }`
    - `{ label: 'PyTorch 수정 PR', value: `병합 ${merged} · 리뷰 중 ${inReview} · 닫힘 ${closedPrs}`, evidence: 'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh', status: merged > 0 ? 'ok' : 'wait' }`
  - `entail`: use the items whose `project` is `entail`.
    - `{ label: `외부 이슈 (${repos as shortRepo joined with '·'})`, value: `${issues}건 · 열림 ${openIssues}`, evidence: 'https://github.com/search?q=author%3Awwoosshh+-user%3Awwoosshh+-org%3Asemicollon-club&type=issues', status: 'wait' }`
    - If any `related` PRs exist: `{ label: '다른 개발자의 수정 PR', value: `열림 ${open} · 병합 ${merged} · 닫힘 ${closed}`, evidence: <url of the first related PR>, status: merged > 0 ? 'ok' : open > 0 ? 'wait' : 'off' }`
    - `{ label: 'PyPI 릴리스', value: `${pypiReleases}개 (최신 ${pypiLatest})`, evidence: own.entail.url, status: 'ok' }`
  - `asahi`: `{ label: `main에 병합된 PR (제 계정 ${mine}건 + 다른 계정 ${total - mine}건)`, value: `${total}건`, evidence: own.asahi.url, status: 'ok' }`
  - Any other project: `[]`.

  Tests:
  - Use a fixture `Contributions` object.
  - Each rule produces the exact label and value text.
  - `metricsOf` puts the live metrics first.

- [ ] **Step 3: Remove stale static metrics and reword status claims in MDX.**
  - `torch-compile-fuzzer.mdx`: delete the frontmatter metrics `PyTorch 이슈 분류 (6 / 6 triaged)` and `PyTorch 수정 PR (5건 리뷰 중 · 1건 닫힘)`.
  - `entail.mdx`: delete the frontmatter metrics `vLLM 수정 PR (보고 후 다른 개발자가 올림)`, `SGLang 수정 PR (보고 후 다른 개발자가 올림)` and `PyPI 릴리스`.
  - `asahi.mdx`: delete the frontmatter metric `main 브랜치에 머지된 PR (제 계정 79건 + 봇 계정 2건)`.
  - Every featured project must still have at least one metric.
  - In the bodies and briefs of those three files, rewrite every sentence that states a status that can change. Search for `리뷰 중`, `리뷰 대기`, `닫힘`, `작성 시점`, `머지된 PR 81`, `16개`, `2.1.4`. Turn each into a timeless fact plus a pointer: "현재 상태는 아래 외부 기여 목록에서 매일 자동으로 갱신됩니다." Facts about what was reported or submitted stay as they are.
  - List every sentence you changed, before and after, in the report.

- [ ] **Step 4: Consumers.**
  - Use `metricsOf(entry, site.contributions)` wherever metrics are read: `ProjectScene`, `BuildDeck` (first two), `ProjectBrief`, `ProjectCard` (lead) and `[id].astro` (`MetricList`).
  - Thread `site.contributions` through, or import `contributions` directly in those components. Choose the simpler option and stay consistent.
- [ ] **Step 5: ContributionList.**
  - Change the header text to `매일 자동 확인 · 마지막 변경 {formatDate(asOf)}`.
  - Under each item that has `related`, render a list: `다른 개발자의 수정 PR <a href={r.url} target="_blank" rel="noopener noreferrer">{shortRepo(r.repo)}#{r.number} ↗</a> <Status view={relatedStatus(r)} />`.
- [ ] **Step 6: Profile.** In `src/data/profile.ts`, import `contributions` and `tally`/`shortRepo`, and compute the PyTorch tally (items in `pytorch/pytorch`) and the overall tally before `profileSchema.parse`.
  - `intro[0]`: `한국어 시스템 언어의 컴파일러를 만들었고, PyTorch 컴파일러와 LLM 추론 엔진이 오류 없이 틀린 값을 내는 지점을 찾아 보고하고 고칩니다. PyTorch 기여자로 수정 ${pt.merged}건이 병합되었습니다.`
  - highlights[0]:
    - label: `PyTorch 기여자 · 병합 ${pt.merged}건`
    - detail: `torch.compile에서 찾은 버그를 이슈 ${pt.issues}건으로 보고하고 수정 PR ${pt.prs}건을 냈습니다. 병합 ${pt.merged}건, 리뷰 중 ${pt.inReview}건.`
    - status: `'ok'`
    - statusText: `merged ${pt.merged}`
    - evidence: `'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh'`
    - figure: `{ value: String(pt.merged), unit: '건 병합' }`
  - highlights[1]:
    - label: `오픈소스 ${all.repos}곳에 기여`
    - detail: `${repo names via shortRepo joined with '·'}에 이슈 ${all.issues}건, PR ${all.prs}건을 올렸습니다.`
    - status: `'ok'`
    - statusText: `issues ${all.issues} · PRs ${all.prs}`
    - evidence: the GitHub search URL from Step 2
    - figure: `{ value: String(all.repos), unit: '개 프로젝트' }`
  - highlights[2]: Geul is unchanged.
  - highlights[3]:
    - label: `'AI 개발 에이전트 운영'`
    - detail: `동아리에서 실제로 쓰는 디스코드 AI 개발 에이전트 asahi의 개발을 이끌고 운영합니다. main 브랜치에 병합된 PR ${own.asahi.mergedPrs}건.`
    - statusText: `${n} PRs merged`
    - figure: `{ value: String(n), unit: '건 병합' }`
    - evidence: `own.asahi.url`
  - Update `highlights.spec.ts` if it reads figures from `profile`. It already imports `profile`, so values stay in sync.
- [ ] **Step 7: Verify and commit.**
  - Run the full `npx vitest run`, `npx astro check` and `npm run test:e2e`. Fix any test that asserted old wording by reading values from the data or profile. Do not hard-code counts.
  - Commit: `feat: 상태 문구와 수치를 기여 데이터에서 계산 — 소개·핵심 성과·프로젝트 수치가 어긋나지 않게` with the trailer.

### Task 3: Home restructure (오픈소스 / 개인 프로젝트 chapters, contribution board scene)

**Files:**
- Modify: `src/lib/schema.ts`
  - Add `group: z.enum(['oss', 'personal']).optional()` to the project frontmatter.
  - In `superRefine`, featured projects must have a group.
- Modify: the 8 featured MDX files.
  - `group: oss` for entail, torch-compile-fuzzer, geul-lang, inversa-bench and asahi.
  - `group: personal` for barun-order, mzcube and nogada-rpg.
- Modify: `src/lib/site.ts`
  - Replace `ml` and `agentProduct` with `oss` and `personal`, filtered by `group` among the featured projects, in `order` order.
  - Keep `track` untouched.
- Modify: `src/lib/chapters.ts`. Set it to `[{ id: 'oss', label: '오픈소스' }, { id: 'personal', label: '개인 프로젝트' }, { id: 'experience', label: '경력' }, { id: 'contact', label: '연락처' }]`.
- Create: `src/components/scenes/ContributionBoard.astro` and `src/motion/scenes/contrib.ts`. Register the scene in `scenes/index.ts`.
- Modify: `src/components/scenes/ProjectScene.astro`. Add a `headingLevel?: 3 | 4` prop, default 3, used for the title element.
- Modify: `src/pages/index.astro` (the `#oss` and `#personal` sections) and `src/pages/projects/[id].astro` (the back-link anchor uses `group`: `#oss` or `#personal`).
- Tests:
  - Update `content.spec.ts`, `chapters.spec.ts`, `motion.spec.ts` (chapter hrefs and anchors), `home.spec.ts` and `deck.spec.ts` (`#personal`, 3 slides).
  - Create `tests/e2e/contrib.spec.ts`.

- [ ] **Step 1: Failing tests.** `tests/e2e/contrib.spec.ts` imports `src/data/contributions.json` and covers:
  1. **Reduced motion.**
     - `#oss .cboard` shows one `.cboard__repo` per distinct repo, with PyTorch first.
     - Each item shows its status text: one of the Global Constraints words.
     - Each item has an external link with `rel="noopener noreferrer"` and `↗`.
     - For every item with `related`, the related PR link and its status word are present.
     - The `.cboard__sum` numbers equal the counts computed from the JSON: merged, inReview, issues, repos.
     - The as-of line contains `매일 자동 확인`.
  2. **Motion on.** After scrolling the board into view, the summary numbers settle to the same values, and no `[data-reveal]` inside `.cboard` stays hidden.
  3. **Chapter order.** `main > section[id]` ids start `intro, highlights, oss, personal`, and the top-bar hrefs are `['/#oss', '/#personal', '/#experience', '/#contact']`.

  Update the existing specs to the new ids, titles and counts:
  - `#oss` holds 5 project scenes in `order` order: entail, torch-compile-fuzzer, geul-lang, inversa-bench, asahi.
  - The `#personal` deck holds 3 slides: barun-order, mzcube, nogada-rpg.

  Run them and confirm they FAIL.

- [ ] **Step 2: ContributionBoard markup** (`src/components/scenes/ContributionBoard.astro`).
  - Props: `{ contributions: Contributions; byId: Map<string, ProjectEntry> }`.
  - Root: `<div class="cboard" data-scene="contrib">`, containing:
    - `<h3 class="cboard__title" data-reveal>외부 프로젝트 기여</h3>`
    - `<dl class="cboard__sum" data-reveal>` with four `<div><dt>…</dt><dd data-count>{n}</dd></div>`: 병합, 리뷰 중, 이슈, 프로젝트. The values come from `tally(items)`.
    - For each group in `byRepo(items)`, a `<section class="cboard__repo panel" data-repo={repo} aria-labelledby={id}>` containing:
      - `<header data-reveal>` with `<h4 id={id}>` holding an external repo link (`https://github.com/${repo}`, target, rel, ↗). The link text is `{shortRepo(repo)} · {repo}`.
      - A counts line, mono: `이슈 n · PR n · 병합 n`.
      - When `tools` is non-empty: `찾은 도구:` followed by links to `/projects/<id>/`, using each project's title.
      - `<ul class="cboard__items">`. Items within a group are ordered PRs first, then by number. Each item is `<li class="cboard__item" data-reveal data-state={c.state}>` with:
        - a kind label (`PR`/`이슈`);
        - `<Status view={contributionStatus(c)} />`;
        - the external `#number ↗` link;
        - the title;
        - when `related` is non-empty, a nested list with `다른 개발자의 수정 PR`, a link and `<Status view={relatedStatus(r)} />`.
    - `<p class="cboard__asof mono" data-reveal>매일 자동 확인 · 마지막 변경 {formatDate(asOf)}</p>`
  - Style:
    - Tokens only. Re-use `.panel` for each repo group.
    - Use a responsive grid: two columns at 1024 px or wider when there are 3 or more groups. Otherwise use one column.
    - The summary is a 4-up row of big numbers using `--fs-figure` and `tabular-nums`.
    - Long titles wrap: `overflow-wrap: anywhere` is inherited.
    - No horizontal overflow at 390 px.
- [ ] **Step 3: Scene** (`src/motion/scenes/contrib.ts`).
  - Static mode returns at once.
  - Claim the title, the summary, and every `[data-reveal]` inside the groups.
  - A head timeline, played by `playOnEnter(tl, { trigger: root, start: 'top 75%' })`, fades the title and summary in (opacity, y 16, stagger 0.08) and runs `countUp` on each `[data-count]`.
  - For each group, a timeline played by `playOnEnter(tl, { trigger: group, start: reachableStart(group, 0.85) })`:
    - fades in its parts (opacity, y 12, stagger 0.05);
    - then stamps the status chips of merged items: `fromTo` scale 1.6 → 1 and opacity 0 → 1, `EASE.back`, `DURATION.slow`, stagger 0.1. This is the designated big motion of this scene (spec §3).
  - Leave the as-of line to `revealRemaining`; do not claim it.
  - Cleanup kills every trigger and timeline and restores the count texts.
  - Use the real root class of `Status.astro` for the stamp selector. Read it from the component; do not guess.
- [ ] **Step 4: Assemble the chapters** in `src/pages/index.astro`.

```astro
  <section id="oss" class="container container--wide" aria-labelledby="oss-title">
    <ChapterCard id="oss" num="1장" title="오픈소스" lead="검증받은 기여와 직접 운영하는 오픈소스" />
    <ContributionBoard contributions={site.contributions} byId={site.byId} />
    <h3 class="chapter-sub" data-reveal>직접 운영하는 오픈소스</h3>
    {site.oss.map((p, i) => <ProjectScene project={p} num={`1-${i + 1}`} headingLevel={4} />)}
  </section>
  <section id="personal" aria-labelledby="personal-title">
    <div class="container container--wide">
      <ChapterCard id="personal" num="2장" title="개인 프로젝트" lead="직접 만든 제품과 실험" />
    </div>
    <BuildDeck projects={site.personal} />
  </section>
```

  - Keep the remaining sections in order: experience, how-i-work, more, skills, contact.
  - Rename the `#ml { overflow-x: clip }` rule to `#oss`.
  - Give `.chapter-sub` a modest token-based style. Keep the spacing rule.
- [ ] **Step 5: Verify.**
  - Run the full `npx vitest run`, `npx astro check` and `npm run test:e2e`.
  - Check the full scroll in all modes (`motion.spec`, including `hiddenReveals` over `[data-reveal], [data-pop], [data-fade]`) and that the layout has no overflow at 390, 834 and 1280 px.
  - Take headless screenshots of `#oss` and `#personal` at 1440 and 390 px. Save them under the session scratchpad and list them in the report.
  - Commit: `feat: 홈을 오픈소스·개인 프로젝트 두 장으로 — 외부 기여 보드 장면` with the trailer.

### Task 4: Print/PDF and README

**Files:** `src/pages/print.astro`, `README.md`, `public/portfolio.pdf`

- [ ] **Step 1: Restructure `src/pages/print.astro`.** Use this order:
  1. Header, highlights and experience, as now.
  2. **오픈소스:**
     - A compact table of the external contributions. Columns are repo short name, `kind #number`, status word and title. Related PRs go inline: `다른 개발자 수정 PR #n (상태)`.
     - The line `매일 자동 확인 · 마지막 변경 YYYY-MM-DD`.
     - `ProjectBrief` for `site.oss`. Choose sizes so that the document stays at 4 pages or fewer.
  3. **개인 프로젝트:** `ProjectBrief` for `site.personal`.
  4. 그 밖의 프로젝트, 기술 스택 and the footnote, as now.

  Remove the old "외부 기여" block at the end, because it has moved up. `print.spec.ts` must pass with 4 pages or fewer, and with no phone number.
- [ ] **Step 2: README.**
  - Update the description of the home structure: 오픈소스 then 개인 프로젝트.
  - Add a short "기여 데이터 자동 갱신" section. It names the workflow, says it runs daily at 06:00 KST, says the script commits only when the data changed, and gives the local command: `GITHUB_TOKEN=$(gh auth token) node --experimental-strip-types scripts/refresh-contributions.ts`.
- [ ] **Step 3: PDF.** Run `npm run pdf`. Expect at most 4 pages. Then run both privacy checks:
  - `pdftotext -enc UTF-8 -layout public/portfolio.pdf - | grep -cE "01[016789][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}"` → `0`
  - the e-mail extraction → only `nunconnect1@gmail.com`

  Never run `pdf:private`.
- [ ] **Step 4: Full check and commit.**
  - Run `npm test && npm run build && npx playwright test`.
  - Commit: `feat: 인쇄본도 오픈소스·개인 프로젝트 순서로, README에 자동 갱신 안내` with the trailer.
