# 포트폴리오 사이트 구현 계획

> 이 문서는 구현 전에 쓴 계획입니다. 구현하면서 원본 자료와 대조하고 사용자 검토를 거쳐 문구·수치·설계 일부가 달라졌습니다. 달라진 판단은 문서 끝 부록에 정리했고, 사이트의 실제 내용은 `src/`가 기준입니다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "정확성을 검증하는 AI/ML 시스템 엔지니어"를 간판으로 한 한국어 포트폴리오를 Astro 정적 사이트와 A4 PDF로 만든다. 두 결과물은 같은 데이터에서 나온다.

**Architecture:** 프로젝트는 MDX 콘텐츠 컬렉션 하나(`projects`)로 관리한다. 프로필과 외부 기여는 TypeScript 데이터 파일로 관리한다. 모든 데이터는 `src/lib/schema.ts`의 Zod 스키마로 검사하고, 파일 사이의 참조는 `src/lib/integrity.ts`로 검사한다. 규칙을 어기면 빌드가 실패한다. 화면은 그림자 없는 디자인 토큰과 작은 컴포넌트들로 조립하고, 같은 데이터로 `/print` 페이지를 그린 뒤 Playwright로 PDF를 만든다.

**Tech Stack:** Astro 7.3.5, @astrojs/mdx 8.0.2, Zod 4(`astro/zod`), TypeScript 6.0.3, @astrojs/check 0.9.10, Vitest 5.0.2(+ Astro Container API), @playwright/test 1.63.0, pdf-lib 1.17.1, pretendard 1.3.9, @fontsource/jetbrains-mono 5.3.0, Node 22.12 이상

**Spec:** `docs/superpowers/specs/2026-09-29-portfolio-design.md`

## Global Constraints

- **작업 위치:** 모든 명령은 Git Bash에서 `cd /c/Portpolio/site` 한 뒤 실행한다. 저장소 루트는 `C:\Portpolio\site`다.
- **Node:** `>=22.12.0`. 현재 PC는 v22.19.0이다.
- **버전 고정:** `package.json`에는 정확한 버전만 적는다(`^`·`~` 금지). astro 7.3.5, @astrojs/mdx 8.0.2, @astrojs/check 0.9.10, typescript 6.0.3(@astrojs/check가 TypeScript 7을 지원하지 않는다), vitest 5.0.2, @playwright/test 1.63.0, pdf-lib 1.17.1, pretendard 1.3.9, @fontsource/jetbrains-mono 5.3.0
- **Zod:** 항상 `import { z } from 'astro/zod'`(Zod 4). URL은 `z.url()`, 이메일은 `z.email()`을 쓴다. `z.string().url()`은 쓰지 않는다.
- **언어:** 화면 문구는 한국어, `<html lang="ko">`. 코드 식별자는 영어로 쓴다.
- **디자인 규칙 (스펙 5장)**
  - `box-shadow`·`text-shadow`·`transform`·`transition`·`animation`을 쓰지 않는다.
  - 색 값(hex)은 `src/styles/tokens.css`에만 둔다.
  - `linear-gradient`는 `.mark`(제목 형광펜) 한 곳만 쓴다.
  - `border-radius`는 `var(--r-sm)`, `var(--r-md)`, `50%`만 쓴다.
  - 간격은 4의 배수 토큰(`--sp-*`)을 쓴다.
- **근거 규칙:** 화면에 나오는 모든 수치는 근거 URL이 있어야 한다. `{ private: true, note }` 근거는 `repo.visibility: private`인 프로젝트에서만 허용된다.
- **문구 규칙**
  - "PyTorch 기여자/컨트리뷰터"라고 쓰지 않는다(머지된 PR 없음).
  - "혼자서 만들었다" 대신 "1인 개발 · AI 코딩 에이전트 협업"이라고 쓴다.
  - `deployment.state: down`인 서비스를 "운영 중"이라고 쓰지 않는다.
  - 취득하지 않은 자격증은 쓰지 않는다.
  - 확인할 수 없는 주장은 넣지 않는다.
- **개인정보**
  - 전화번호와 개인 Gmail 주소는 저장소, 빌드 결과, 공개 PDF, 이 계획 문서 어디에도 넣지 않는다.
  - 공개 연락처는 `nunconnect1@gmail.com`(업무용)과 GitHub뿐이다.
  - 전화번호는 저장소 밖 `C:\Portpolio\private\contact.json`에만 있고, 제출용 PDF를 만들 때만 읽는다.
- **비공개 자료:** `C:\Portpolio\research\`(조사 자료)와 `C:\Portpolio\.superpowers\`(시안)는 저장소 밖에 있다. 이 자료의 보안 문제, 회사 내부 정보 같은 민감한 내용을 저장소 파일에 옮기지 않는다.
- **커밋:** 저장소 전용 작성자(`wwoosshh <122337168+wwoosshh@users.noreply.github.com>`)가 이미 설정되어 있다. 모든 커밋 메시지는 다음 줄로 끝난다.
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  (`git commit -m "<제목>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`)
- **푸시:** 작업 중에는 푸시하지 않는다. 푸시는 Task 17에서 사용자 확인을 받고 한다.

---

## 파일 구조

```
site/
├── package.json · package-lock.json      의존성과 npm 스크립트
├── astro.config.mjs                      Astro 설정(MDX)
├── tsconfig.json                         strict 템플릿
├── vitest.config.ts                      단위·컴포넌트 테스트
├── playwright.config.ts                  E2E(미리보기 서버)
├── .gitignore · .gitattributes
├── .github/workflows/ci.yml              테스트·빌드·E2E
├── README.md
├── public/
│   ├── favicon.svg
│   └── portfolio.pdf                     공개용 PDF(생성 후 커밋)
├── scripts/
│   ├── make-pdf.mjs                      공개용/제출용 PDF 생성
│   └── check-links.mjs                   dist의 외부 링크 검사
├── src/
│   ├── content.config.ts                 projects 컬렉션
│   ├── content/projects/*.mdx            프로젝트 콘텐츠(파일 이름 = id)
│   ├── data/
│   │   ├── profile.ts                    프로필(스키마로 검사)
│   │   ├── contributions.ts              외부 PR·이슈(스키마로 검사)
│   │   └── data.test.ts
│   ├── lib/
│   │   ├── schema.ts (+ .test.ts)        Zod 스키마와 타입
│   │   ├── format.ts (+ .test.ts)        기간·날짜·근거 짧은 이름
│   │   ├── status.ts (+ .test.ts)        상태(✓●○) 계산
│   │   ├── integrity.ts (+ .test.ts)     파일 사이 참조 검사
│   │   ├── links.ts (+ .test.ts)         프로젝트의 대표 링크
│   │   ├── timeline.ts (+ .test.ts)      경력·활동 타임라인
│   │   ├── site.ts                       컬렉션 로드 + 무결성 + 섹션 분류
│   │   └── style-rules.test.ts           디자인 규칙 정적 검사
│   ├── styles/
│   │   ├── tokens.css                    디자인 토큰(유일한 색 정의)
│   │   └── global.css                    기본 스타일과 공용 클래스
│   ├── layouts/
│   │   ├── Base.astro                    웹 페이지 틀(머리글·바닥글)
│   │   └── Print.astro                   A4 인쇄 틀
│   ├── components/
│   │   ├── Status · Tag · Button · Evidence · SectionHeader .astro
│   │   ├── MetricList · ProjectCard · ProjectLine · Timeline · ContributionList .astro
│   │   ├── ProjectBrief.astro            인쇄용 프로젝트 요약
│   │   ├── primitives.test.ts
│   │   └── composites.test.ts
│   └── pages/
│       ├── index.astro                   홈(9개 섹션)
│       ├── projects/[id].astro           대표작 상세
│       └── print.astro                   PDF 원본
└── tests/e2e/
    ├── smoke.spec.ts · design.spec.ts · home.spec.ts · project.spec.ts
    ├── layout.spec.ts · print.spec.ts · content.spec.ts
```

**프로젝트 id(파일 이름) 목록 — 모든 작업이 이 이름을 쓴다**

| id | tier | track | order |
|---|---|---|---|
| `entail` | featured | ml | 1 |
| `torch-compile-fuzzer` | featured | ml | 2 |
| `geul-lang` | featured | ml | 3 |
| `inversa-bench` | featured | ml | 4 |
| `asahi` | featured | agent | 5 |
| `barun-order` | featured | product | 6 |
| `mzcube` | featured | product | 7 |
| `nogada-rpg` | featured | product | 8 |
| `geulos` | card | other | 20 |
| `connect` | card | other | 21 |
| `monney` | card | other | 22 |
| `semicollon-homepage` | line | other | 30 |
| `gitspace` | line | other | 31 |
| `novel-worker` | line | other | 32 |
| `battle-arena` | line | other | 33 |

## 작업 순서

| 단계 | 작업 |
|---|---|
| 기반 | 1 골격 · 2 스키마 · 3 형식·상태 함수 · 4 데이터 계층 |
| 디자인 | 5 토큰·레이아웃 · 6 기본 부품 · 7 조합 부품 |
| 페이지 | 8 홈 · 9 상세 · 10 반응형·접근성 |
| PDF·도구 | 11 인쇄 페이지·PDF · 12 링크 검사·CI |
| 콘텐츠 | 13 ML 대표작 · 14 에이전트·제품 대표작 · 15 카드·한 줄·기술 스택 |
| 마무리 | 16 사용자 검토·PDF 생성 · 17 README·최종 확인·푸시·배포 안내 |

---

### Task 1: 프로젝트 골격

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.gitattributes`, `playwright.config.ts`, `src/pages/index.astro`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - npm 스크립트: `dev`, `build`(= `astro check && astro build`), `preview`, `test`(= `vitest run`), `test:e2e`(= `astro build && playwright test`), `pdf`, `pdf:private`, `check:links`
  - Playwright `baseURL` `http://localhost:4321/`

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "portfolio",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:e2e": "astro build && playwright test",
    "pdf": "astro build && node scripts/make-pdf.mjs",
    "pdf:private": "astro build && node scripts/make-pdf.mjs --private",
    "check:links": "node scripts/check-links.mjs"
  },
  "dependencies": {
    "@astrojs/mdx": "8.0.2",
    "@fontsource/jetbrains-mono": "5.3.0",
    "astro": "7.3.5",
    "pretendard": "1.3.9"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "@playwright/test": "1.63.0",
    "pdf-lib": "1.17.1",
    "typescript": "6.0.3",
    "vitest": "5.0.2"
  }
}
```

- [ ] **Step 2: 설정 파일 작성**

`astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`.gitignore`:

```
node_modules/
dist/
.astro/
test-results/
playwright-report/
.env
.env.*
```

`.gitattributes`:

```
* text=auto eol=lf
*.pdf binary
*.png binary
*.woff2 binary
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321/',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: 실패하는 E2E 스모크 테스트 작성**

`tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('홈이 한국어 문서로 열린다', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page).toHaveTitle(/우성현/);
});
```

- [ ] **Step 4: 의존성과 브라우저 설치**

Run: `cd /c/Portpolio/site && npm install && npx playwright install chromium`
Expected: `added ... packages`. Chromium이 설치된다(약 150MB, `%LOCALAPPDATA%\ms-playwright`). pretendard 패키지는 약 97MB다.

- [ ] **Step 5: 테스트가 실패하는지 확인**

Run: `npx playwright test`
Expected: FAIL. 빌드 결과(`dist/`)가 없어서 미리보기 서버가 뜨지 않거나, 홈이 없어 404가 나온다.

- [ ] **Step 6: 최소 홈 페이지 작성**

`src/pages/index.astro`:

```astro
---
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>우성현 · 포트폴리오</title>
  </head>
  <body>
    <h1>포트폴리오 준비 중</h1>
  </body>
</html>
```

- [ ] **Step 7: 빌드와 테스트 통과 확인**

Run: `npm run build && npx playwright test`
Expected: `astro check`의 `0 errors`, 빌드 `Complete!`, Playwright `1 passed`.

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json .gitignore .gitattributes playwright.config.ts src/pages/index.astro tests/e2e/smoke.spec.ts
git commit -m "chore: Astro 7 프로젝트 골격과 E2E 스모크 테스트" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 콘텐츠 스키마

**Files:**
- Create: `vitest.config.ts`, `src/lib/schema.ts`, `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces (`src/lib/schema.ts`):
  - 스키마: `periodSchema`, `statusToneSchema`, `evidenceSchema`, `metricSchema`, `linkSchema`, `projectSchema`, `contributionSchema`, `contributionsSchema`, `profileSchema`
  - 타입: `Project`, `Contribution`, `Contributions`, `Profile`, `Evidence`(= `string | { private: true; note: string }`), `Metric`, `Link`, `StatusTone`(= `'ok' | 'wait' | 'off'`)

- [ ] **Step 1: Vitest 설정**

`vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { contributionSchema, profileSchema, projectSchema } from './schema';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message);

const validProject = {
  title: 'Entail',
  tagline: '설정이 엔진에 도달했는지 검사한다',
  tier: 'featured',
  track: 'ml',
  order: 1,
  period: { start: '2026-09', end: '2026-09' },
  role: '1인 개발 · AI 코딩 에이전트 협업',
  stack: ['Python'],
  repo: { visibility: 'public', url: 'https://github.com/wwoosshh/Entail' },
  deployment: { state: 'none' },
  asOf: '2026-09-29',
  brief: { problem: '문제', approach: '접근', result: '결과' },
  metrics: [
    { label: 'GSM8K', value: '379 → 273', evidence: 'https://github.com/vllm-project/vllm/issues/58675' },
  ],
  aiCollab: '문제 정의와 검증은 직접, 구현은 AI와 협업',
};

describe('projectSchema', () => {
  test('올바른 대표작은 통과하고 기본값이 채워진다', () => {
    const result = projectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.links).toEqual([]);
      expect(result.data.tags).toEqual([]);
      expect(result.data.asOf).toBeInstanceOf(Date);
    }
  });

  test('근거가 URL이 아니면 실패한다', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      metrics: [{ label: 'x', value: '1', evidence: '그냥 글' }],
    });
    expect(result.success).toBe(false);
  });

  test('근거가 없으면 실패한다', () => {
    const result = projectSchema.safeParse({ ...validProject, metrics: [{ label: 'x', value: '1' }] });
    expect(result.success).toBe(false);
  });

  test('대표작은 수치가 1개 이상 필요하다', () => {
    const result = projectSchema.safeParse({ ...validProject, metrics: [] });
    expect(messages(result)).toContain('대표작은 근거가 있는 수치가 1개 이상 필요합니다');
  });

  test('대표작은 brief가 필요하다', () => {
    const { brief: _omit, ...rest } = validProject;
    const result = projectSchema.safeParse(rest);
    expect(messages(result)).toContain('대표작은 brief(문제·접근·결과 요약)가 필요합니다');
  });

  test('대표작의 track은 other일 수 없다', () => {
    const result = projectSchema.safeParse({ ...validProject, track: 'other' });
    expect(messages(result)).toContain('대표작은 track이 ml, agent, product 중 하나여야 합니다');
  });

  test('공개 저장소 프로젝트는 비공개 근거를 쓸 수 없다', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      metrics: [{ label: 'x', value: '1', evidence: { private: true, note: '면접에서 시연' } }],
    });
    expect(messages(result)).toContain('비공개 근거는 비공개 저장소 프로젝트에서만 쓸 수 있습니다');
  });

  test('비공개 저장소 프로젝트는 비공개 근거를 쓸 수 있다', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      repo: { visibility: 'private' },
      metrics: [{ label: 'x', value: '1', evidence: { private: true, note: '면접에서 시연' } }],
    });
    expect(result.success).toBe(true);
  });

  test('비공개 저장소에는 URL을 적을 수 없다', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      repo: { visibility: 'private', url: 'https://github.com/wwoosshh/secret' },
    });
    expect(result.success).toBe(false);
  });

  test('운영 중(live) 배포는 URL이 필요하다', () => {
    const result = projectSchema.safeParse({ ...validProject, deployment: { state: 'live' } });
    expect(result.success).toBe(false);
  });

  test('종료 월이 시작 월보다 앞서면 실패한다', () => {
    const result = projectSchema.safeParse({ ...validProject, period: { start: '2026-09', end: '2026-01' } });
    expect(messages(result)).toContain('종료 월이 시작 월보다 앞설 수 없습니다');
  });

  test('기간은 YYYY-MM 형식이어야 한다', () => {
    const result = projectSchema.safeParse({ ...validProject, period: { start: '2026.09' } });
    expect(messages(result)).toContain('YYYY-MM 형식이어야 합니다');
  });

  test('aiCollab이 없으면 실패한다', () => {
    const { aiCollab: _omit, ...rest } = validProject;
    expect(projectSchema.safeParse(rest).success).toBe(false);
  });
});

describe('contributionSchema', () => {
  const pr = {
    repo: 'pytorch/pytorch',
    kind: 'pr',
    number: 198096,
    title: '[inductor] Do not reinplace into a graph input that a later, unrelated mutation overwrites',
    state: 'open',
    url: 'https://github.com/pytorch/pytorch/pull/198096',
    project: 'torch-compile-fuzzer',
  };

  test('저장소·번호와 URL이 일치하면 통과한다', () => {
    const result = contributionSchema.safeParse(pr);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.labels).toEqual([]);
  });

  test('URL이 저장소·번호와 다르면 실패한다', () => {
    const result = contributionSchema.safeParse({ ...pr, url: 'https://github.com/pytorch/pytorch/pull/1' });
    expect(messages(result)).toContain('URL은 https://github.com/pytorch/pytorch/pull/198096 이어야 합니다');
  });

  test('이슈는 merged 상태일 수 없다', () => {
    const result = contributionSchema.safeParse({
      ...pr,
      kind: 'issue',
      state: 'merged',
      url: 'https://github.com/pytorch/pytorch/issues/198096',
    });
    expect(messages(result)).toContain('이슈는 merged 상태일 수 없습니다');
  });
});

describe('profileSchema', () => {
  const validProfile = {
    name: '우성현',
    nameEn: 'Woo Sunghyeun',
    asOf: '2026-09-29',
    headline: { mark: '정확성을 검증하는', rest: 'AI/ML 시스템 엔지니어' },
    intro: ['소개 한 줄'],
    contact: { email: 'nunconnect1@gmail.com', github: 'https://github.com/wwoosshh' },
    highlights: [1, 2, 3].map((n) => ({
      label: `성과 ${n}`,
      detail: '설명',
      status: 'ok',
      statusText: 'ok',
      evidence: 'https://github.com/wwoosshh',
    })),
    education: [{ school: '청운대학교', major: '컴퓨터공학과', period: { start: '2022-03' }, status: '재학' }],
    experience: [
      {
        org: '회사',
        product: '제품',
        period: { start: '2026-06' },
        role: '개발',
        employment: '근로',
        bullets: ['한 일'],
        disclosure: 'text-only',
      },
    ],
    activities: [],
    howIWork: {
      principles: [{ title: '원칙', body: '설명' }],
      evidence: [{ label: '근거', url: 'https://github.com/wwoosshh', kind: 'doc' }],
    },
    skills: [{ group: '그룹', items: [{ name: '기술', projects: ['entail'] }] }],
  };

  test('올바른 프로필은 통과한다', () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });

  test('핵심 성과가 3개보다 적으면 실패한다', () => {
    const result = profileSchema.safeParse({ ...validProfile, highlights: validProfile.highlights.slice(0, 2) });
    expect(result.success).toBe(false);
  });

  test('이메일 형식이 아니면 실패한다', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      contact: { ...validProfile.contact, email: 'not-an-email' },
    });
    expect(result.success).toBe(false);
  });

  test('경력은 text-only 공개만 허용한다', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      experience: [{ ...validProfile.experience[0], disclosure: 'screenshots' }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL. `Failed to resolve import "./schema"`.

- [ ] **Step 4: 스키마 구현**

`src/lib/schema.ts`:

```ts
import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM 형식이어야 합니다');

export const periodSchema = z
  .object({ start: yearMonth, end: yearMonth.optional() })
  .refine((p) => !p.end || p.end >= p.start, {
    message: '종료 월이 시작 월보다 앞설 수 없습니다',
    path: ['end'],
  });

export const statusToneSchema = z.enum(['ok', 'wait', 'off']);

export const evidenceSchema = z.union([
  z.url(),
  z.strictObject({ private: z.literal(true), note: z.string().min(1) }),
]);

export const metricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  evidence: evidenceSchema,
  status: statusToneSchema.optional(),
});

export const linkSchema = z.object({
  label: z.string().min(1),
  url: z.url(),
  kind: z.enum(['repo', 'pr', 'issue', 'package', 'site', 'video', 'doc', 'ci']),
});

const repoSchema = z.discriminatedUnion('visibility', [
  z.strictObject({ visibility: z.literal('public'), url: z.url() }),
  z.strictObject({ visibility: z.literal('private') }),
]);

const deploymentSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('live'), url: z.url() }),
  z.strictObject({
    state: z.literal('down'),
    url: z.url().optional(),
    video: z.url().optional(),
    screenshot: z.string().optional(),
  }),
  z.strictObject({ state: z.literal('none') }),
]);

const briefSchema = z.object({
  problem: z.string().min(1),
  approach: z.string().min(1),
  result: z.string().min(1),
});

export const projectSchema = z
  .object({
    title: z.string().min(1),
    tagline: z.string().min(1),
    tier: z.enum(['featured', 'card', 'line']),
    track: z.enum(['ml', 'agent', 'product', 'other']),
    order: z.number().int(),
    period: periodSchema,
    role: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    repo: repoSchema.optional(),
    deployment: deploymentSchema,
    asOf: z.coerce.date(),
    brief: briefSchema.optional(),
    metrics: z.array(metricSchema).default([]),
    links: z.array(linkSchema).default([]),
    aiCollab: z.string().min(1),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.tier === 'featured') {
      if (p.track === 'other') {
        ctx.addIssue({ code: 'custom', path: ['track'], message: '대표작은 track이 ml, agent, product 중 하나여야 합니다' });
      }
      if (p.metrics.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['metrics'], message: '대표작은 근거가 있는 수치가 1개 이상 필요합니다' });
      }
      if (!p.brief) {
        ctx.addIssue({ code: 'custom', path: ['brief'], message: '대표작은 brief(문제·접근·결과 요약)가 필요합니다' });
      }
    }
    const isPrivate = p.repo?.visibility === 'private';
    p.metrics.forEach((m, i) => {
      if (typeof m.evidence !== 'string' && !isPrivate) {
        ctx.addIssue({
          code: 'custom',
          path: ['metrics', i, 'evidence'],
          message: '비공개 근거는 비공개 저장소 프로젝트에서만 쓸 수 있습니다',
        });
      }
    });
  });

export const contributionSchema = z
  .object({
    repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식이어야 합니다'),
    kind: z.enum(['pr', 'issue']),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: z.enum(['open', 'merged', 'closed']),
    url: z.url(),
    project: z.string().min(1),
    labels: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.kind === 'issue' && c.state === 'merged') {
      ctx.addIssue({ code: 'custom', path: ['state'], message: '이슈는 merged 상태일 수 없습니다' });
    }
    const expected = `https://github.com/${c.repo}/${c.kind === 'pr' ? 'pull' : 'issues'}/${c.number}`;
    if (c.url !== expected) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: `URL은 ${expected} 이어야 합니다` });
    }
  });

export const contributionsSchema = z.object({
  asOf: z.coerce.date(),
  items: z.array(contributionSchema),
});

const experienceSchema = z.object({
  org: z.string().min(1),
  product: z.string().min(1),
  period: periodSchema,
  role: z.string().min(1),
  employment: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  disclosure: z.literal('text-only'),
});

const activitySchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  period: periodSchema,
  bullets: z.array(z.string().min(1)).default([]),
  links: z.array(linkSchema).default([]),
});

const educationSchema = z.object({
  school: z.string().min(1),
  major: z.string().min(1),
  period: periodSchema,
  status: z.string().min(1),
});

const militarySchema = z.object({
  period: periodSchema,
  status: z.string().min(1),
});

const highlightSchema = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
  status: statusToneSchema,
  statusText: z.string().min(1),
  evidence: z.url(),
});

const skillGroupSchema = z.object({
  group: z.string().min(1),
  items: z
    .array(z.object({ name: z.string().min(1), projects: z.array(z.string().min(1)).min(1) }))
    .min(1),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().min(1),
  asOf: z.coerce.date(),
  headline: z.object({ mark: z.string().min(1), rest: z.string().min(1) }),
  intro: z.array(z.string().min(1)).min(1).max(3),
  contact: z.object({
    email: z.email().optional(),
    github: z.url(),
    site: z.url().optional(),
  }),
  highlights: z.array(highlightSchema).min(3).max(4),
  education: z.array(educationSchema).min(1),
  military: militarySchema.optional(),
  experience: z.array(experienceSchema),
  activities: z.array(activitySchema),
  howIWork: z.object({
    principles: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).min(1),
    evidence: z.array(linkSchema).min(1),
  }),
  skills: z.array(skillGroupSchema).min(1),
});

export type Project = z.infer<typeof projectSchema>;
export type Contribution = z.infer<typeof contributionSchema>;
export type Contributions = z.infer<typeof contributionsSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Link = z.infer<typeof linkSchema>;
export type StatusTone = z.infer<typeof statusToneSchema>;
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS(20 tests).

- [ ] **Step 6: 커밋**

```bash
git add vitest.config.ts src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat: 근거 링크를 강제하는 콘텐츠 스키마" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 형식·상태 함수

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/status.ts`, `src/lib/status.test.ts`

**Interfaces:**
- Consumes: `Contribution`, `Project`, `StatusTone` (Task 2)
- Produces:
  - `formatYearMonth(ym: string): string` — `'2026-09'` → `'2026.09'`
  - `formatPeriod(p: { start: string; end?: string }): string` — 끝이 없으면 `'… – 현재'`
  - `formatDate(d: Date): string` — `'YYYY-MM-DD'`(UTC)
  - `shortRef(url: string): string`
  - `type Tone`, `interface StatusView { tone; symbol: '✓' | '●' | '○'; text }`
  - `TONE_TEXT: Record<Tone, string>`
  - `view(tone, text): StatusView`
  - `contributionStatus(c): StatusView`
  - `deploymentStatus(d): StatusView | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/format.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatDate, formatPeriod, formatYearMonth, shortRef } from './format';

describe('기간·날짜', () => {
  test('연-월을 점으로 표시한다', () => {
    expect(formatYearMonth('2026-09')).toBe('2026.09');
  });
  test('시작과 끝이 다르면 범위로 표시한다', () => {
    expect(formatPeriod({ start: '2026-01', end: '2026-03' })).toBe('2026.01 – 2026.03');
  });
  test('시작과 끝이 같으면 한 달로 표시한다', () => {
    expect(formatPeriod({ start: '2026-09', end: '2026-09' })).toBe('2026.09');
  });
  test('끝이 없으면 현재까지로 표시한다', () => {
    expect(formatPeriod({ start: '2026-07' })).toBe('2026.07 – 현재');
  });
  test('날짜는 YYYY-MM-DD로 표시한다', () => {
    expect(formatDate(new Date('2026-09-29'))).toBe('2026-09-29');
  });
});

describe('shortRef', () => {
  test.each([
    ['https://github.com/vllm-project/vllm/issues/58675', 'vllm#58675'],
    ['https://github.com/pytorch/pytorch/pull/198096', 'pytorch#198096'],
    ['https://github.com/wwoosshh/clearly-backend/commit/f586b65', 'clearly-backend@f586b65'],
    ['https://github.com/wwoosshh/geul-lang/actions', 'geul-lang CI'],
    ['https://github.com/wwoosshh/Entail/blob/main/README.md?plain=1#L104-L108', 'Entail/README.md'],
    ['https://github.com/semicollon-club/asahi/tree/main/docs/decisions', 'asahi/docs/decisions'],
    ['https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh', 'pytorch 이슈 목록'],
    ['https://github.com/semicollon-club/asahi/pulls?q=is%3Apr+is%3Amerged', 'asahi PR 목록'],
    ['https://github.com/wwoosshh/foodiemap-website/deployments', 'foodiemap-website 배포 기록'],
    ['https://github.com/wwoosshh/Entail', 'wwoosshh/Entail'],
    ['https://github.com/wwoosshh', 'wwoosshh'],
    [
      'https://github.com/wwoosshh/geul-lang/blob/v2/%EC%99%84%EC%84%B1-%EA%B8%B0%EB%A1%9D-2026-09-21.md?plain=1#L14',
      'geul-lang/완성-기록-2026-09-21.md',
    ],
    ['https://pypi.org/project/entail-ai/', 'pypi:entail-ai'],
    ['https://www.mzcube.com/', 'mzcube.com'],
  ])('%s → %s', (url, expected) => {
    expect(shortRef(url)).toBe(expected);
  });
});
```

`src/lib/status.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { contributionStatus, deploymentStatus, view } from './status';

describe('기여 상태', () => {
  test('머지된 PR', () => {
    expect(contributionStatus({ kind: 'pr', state: 'merged', labels: [] })).toEqual(view('ok', '머지됨'));
  });
  test('열린 PR은 리뷰 중', () => {
    expect(contributionStatus({ kind: 'pr', state: 'open', labels: [] })).toEqual(view('wait', '리뷰 중'));
  });
  test('닫힌 PR은 사유를 함께 보여 준다', () => {
    expect(contributionStatus({ kind: 'pr', state: 'closed', labels: [], note: '절차 안내' })).toEqual(
      view('off', '닫힘 · 절차 안내'),
    );
  });
  test('사유 없이 닫힌 PR', () => {
    expect(contributionStatus({ kind: 'pr', state: 'closed', labels: [] })).toEqual(view('off', '닫힘'));
  });
  test('triaged 라벨이 붙은 열린 이슈는 분류됨', () => {
    expect(contributionStatus({ kind: 'issue', state: 'open', labels: ['triaged'] })).toEqual(view('ok', '분류됨'));
  });
  test('라벨 없는 열린 이슈는 열림', () => {
    expect(contributionStatus({ kind: 'issue', state: 'open', labels: [] })).toEqual(view('wait', '열림'));
  });
  test('닫힌 이슈', () => {
    expect(contributionStatus({ kind: 'issue', state: 'closed', labels: ['triaged'] })).toEqual(view('off', '닫힘'));
  });
});

describe('배포 상태', () => {
  test('live는 운영 중', () => {
    expect(deploymentStatus({ state: 'live', url: 'https://semicollon.com' })).toEqual(view('ok', '운영 중'));
  });
  test('down이고 영상이 있으면 시연 영상을 알린다', () => {
    expect(deploymentStatus({ state: 'down', video: 'https://youtu.be/x' })).toEqual(
      view('off', '서버 중지 · 시연 영상'),
    );
  });
  test('down이고 영상이 없으면 서버 중지', () => {
    expect(deploymentStatus({ state: 'down' })).toEqual(view('off', '서버 중지'));
  });
  test('none이면 표시하지 않는다', () => {
    expect(deploymentStatus({ state: 'none' })).toBeNull();
  });
  test('기호는 톤마다 하나로 고정된다', () => {
    expect([view('ok', '').symbol, view('wait', '').symbol, view('off', '').symbol]).toEqual(['✓', '●', '○']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/format.test.ts src/lib/status.test.ts`
Expected: FAIL. `Failed to resolve import "./format"`, `"./status"`.

- [ ] **Step 3: 구현**

`src/lib/format.ts`:

```ts
export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${year}.${month}`;
}

export function formatPeriod(period: { start: string; end?: string }): string {
  if (!period.end) return `${formatYearMonth(period.start)} – 현재`;
  if (period.end === period.start) return formatYearMonth(period.start);
  return `${formatYearMonth(period.start)} – ${formatYearMonth(period.end)}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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
  if (host === 'pypi.org' && parts[0] === 'project' && parts[1]) return `pypi:${parts[1]}`;
  return host;
}
```

`src/lib/status.ts`:

```ts
import type { Contribution, Project, StatusTone } from './schema';

export type Tone = StatusTone;

export interface StatusView {
  tone: Tone;
  symbol: '✓' | '●' | '○';
  text: string;
}

const SYMBOL: Record<Tone, StatusView['symbol']> = { ok: '✓', wait: '●', off: '○' };

export const TONE_TEXT: Record<Tone, string> = { ok: '확인됨', wait: '진행 중', off: '종료' };

export function view(tone: Tone, text: string): StatusView {
  return { tone, symbol: SYMBOL[tone], text };
}

export function contributionStatus(c: Pick<Contribution, 'kind' | 'state' | 'labels' | 'note'>): StatusView {
  if (c.kind === 'pr') {
    if (c.state === 'merged') return view('ok', '머지됨');
    if (c.state === 'open') return view('wait', '리뷰 중');
    return view('off', c.note ? `닫힘 · ${c.note}` : '닫힘');
  }
  if (c.state === 'closed') return view('off', '닫힘');
  return c.labels.includes('triaged') ? view('ok', '분류됨') : view('wait', '열림');
}

export function deploymentStatus(deployment: Project['deployment']): StatusView | null {
  if (deployment.state === 'live') return view('ok', '운영 중');
  if (deployment.state === 'down') return view('off', deployment.video ? '서버 중지 · 시연 영상' : '서버 중지');
  return null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/format.test.ts src/lib/status.test.ts`
Expected: PASS(31 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/lib/status.ts src/lib/status.test.ts
git commit -m "feat: 기간·근거 이름 형식과 상태(✓●○) 계산" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 데이터 계층 (컬렉션·프로필·기여·무결성)

**Files:**
- Create: `src/lib/integrity.ts`, `src/lib/integrity.test.ts`, `src/content.config.ts`, `src/content/projects/entail.mdx`, `src/data/profile.ts`, `src/data/contributions.ts`, `src/data/data.test.ts`, `src/lib/site.ts`

**Interfaces:**
- Consumes: `projectSchema`, `profileSchema`, `contributionsSchema` 및 타입 (Task 2)
- Produces:
  - `checkIntegrity(input: IntegrityInput): string[]`
    (`IntegrityInput = { projects: { id: string; tier: Project['tier'] }[]; contributions: Contribution[]; skills: Profile['skills'] }`)
  - `profile: Profile` (`src/data/profile.ts`)
  - `contributions: Contributions` (`src/data/contributions.ts`)
  - `type ProjectEntry = CollectionEntry<'projects'>`
  - `interface Site { profile; contributions; all; featured; ml; agentProduct; cards; lines; byId: Map<string, ProjectEntry>; contributionsFor(id): Contribution[] }`
  - `loadSite(): Promise<Site>`. 무결성 오류가 있으면 throw한다.

- [ ] **Step 1: 실패하는 무결성 테스트 작성**

`src/lib/integrity.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { checkIntegrity } from './integrity';
import { contributionSchema } from './schema';

const issue = (number: number, project: string) =>
  contributionSchema.parse({
    repo: 'pytorch/pytorch',
    kind: 'issue',
    number,
    title: 'bug',
    state: 'open',
    url: `https://github.com/pytorch/pytorch/issues/${number}`,
    project,
  });

const projects = [
  { id: 'entail', tier: 'featured' as const },
  { id: 'monney', tier: 'card' as const },
];
const skills = [{ group: 'AI/ML', items: [{ name: 'vLLM', projects: ['entail'] }] }];

describe('checkIntegrity', () => {
  test('모든 참조가 올바르면 오류가 없다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'entail')], skills })).toEqual([]);
  });

  test('없는 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'ghost')], skills })).toEqual([
      '기여 pytorch/pytorch#1: 존재하지 않는 프로젝트 "ghost"',
    ]);
  });

  test('대표작이 아닌 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'monney')], skills })).toEqual([
      '기여 pytorch/pytorch#1: "monney"는 대표작(featured)이 아님',
    ]);
  });

  test('중복된 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'entail'), issue(1, 'entail')], skills })).toEqual([
      '기여 pytorch/pytorch#1: 중복 항목',
    ]);
  });

  test('없는 프로젝트를 가리키는 기술을 잡는다', () => {
    const badSkills = [{ group: 'AI/ML', items: [{ name: 'Rust', projects: ['ghost'] }] }];
    expect(checkIntegrity({ projects, contributions: [], skills: badSkills })).toEqual([
      '기술 "Rust": 존재하지 않는 프로젝트 "ghost"',
    ]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/integrity.test.ts`
Expected: FAIL. `Failed to resolve import "./integrity"`.

- [ ] **Step 3: 무결성 검사 구현**

`src/lib/integrity.ts`:

```ts
import type { Contribution, Profile, Project } from './schema';

export interface IntegrityInput {
  projects: { id: string; tier: Project['tier'] }[];
  contributions: Contribution[];
  skills: Profile['skills'];
}

export function checkIntegrity({ projects, contributions, skills }: IntegrityInput): string[] {
  const errors: string[] = [];
  const tierById = new Map(projects.map((p) => [p.id, p.tier]));
  const seen = new Set<string>();

  for (const c of contributions) {
    const key = `${c.repo}#${c.number}`;
    if (seen.has(key)) errors.push(`기여 ${key}: 중복 항목`);
    seen.add(key);
    const tier = tierById.get(c.project);
    if (tier === undefined) errors.push(`기여 ${key}: 존재하지 않는 프로젝트 "${c.project}"`);
    else if (tier !== 'featured') errors.push(`기여 ${key}: "${c.project}"는 대표작(featured)이 아님`);
  }

  for (const group of skills) {
    for (const skill of group.items) {
      for (const id of skill.projects) {
        if (!tierById.has(id)) errors.push(`기술 "${skill.name}": 존재하지 않는 프로젝트 "${id}"`);
      }
    }
  }
  return errors;
}
```

Run: `npx vitest run src/lib/integrity.test.ts`
Expected: PASS(5 tests).

- [ ] **Step 4: 데이터 파일의 실패하는 테스트 작성**

`src/data/data.test.ts`:

```ts
import { expect, test } from 'vitest';
import { contributions } from './contributions';
import { profile } from './profile';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

test('공개 데이터에 전화번호 형식 문자열이 없다', () => {
  expect(JSON.stringify(profile)).not.toMatch(PHONE);
  expect(JSON.stringify(contributions)).not.toMatch(PHONE);
});

test('공개 연락처는 업무용 이메일과 GitHub뿐이다', () => {
  expect(profile.contact.email).toBe('nunconnect1@gmail.com');
  expect(profile.contact.github).toBe('https://github.com/wwoosshh');
});

test('핵심 성과는 3~4개이고 모두 https 근거가 있다', () => {
  expect(profile.highlights.length).toBeGreaterThanOrEqual(3);
  expect(profile.highlights.length).toBeLessThanOrEqual(4);
  for (const h of profile.highlights) expect(h.evidence.startsWith('https://')).toBe(true);
});

test('실무 경력은 글로만 공개한다', () => {
  for (const e of profile.experience) expect(e.disclosure).toBe('text-only');
});
```

Run: `npx vitest run src/data/data.test.ts`
Expected: FAIL. `Failed to resolve import "./contributions"`.

- [ ] **Step 5: 프로필 작성**

`src/data/profile.ts`. `skills`는 지금 존재하는 `entail`만 참조한다. 전체 기술 목록은 Task 15에서 채운다.

```ts
import { profileSchema } from '../lib/schema';

export const profile = profileSchema.parse({
  name: '우성현',
  nameEn: 'Woo Sunghyeun',
  asOf: '2026-09-29',
  headline: { mark: '정확성을 검증하는', rest: 'AI/ML 시스템 엔지니어' },
  intro: [
    '한국어 시스템 언어의 컴파일러를 직접 만들었고, PyTorch 컴파일러와 LLM 추론 엔진이 오류 없이 틀린 값을 내는 지점을 찾아 보고하고 고칩니다.',
    'AI 코딩 에이전트와 함께 빠르게 만들되, 결과는 믿기 전에 측정하고 검증합니다.',
  ],
  contact: {
    email: 'nunconnect1@gmail.com',
    github: 'https://github.com/wwoosshh',
  },
  highlights: [
    {
      label: 'PyTorch 정합성 버그 6건 보고',
      detail: '직접 만든 퍼저로 찾은 torch.compile의 조용한 오답을 보고했고, 6건 모두 메인테이너가 분류했습니다. 수정 PR 5건이 리뷰 중입니다.',
      status: 'ok',
      statusText: 'triaged 6/6',
      evidence: 'https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh',
    },
    {
      label: 'vLLM·SGLang 버그 보고',
      detail: 'Entail로 찾은 설정 누락을 보고했고, 다른 개발자들이 이를 고치는 PR을 올렸습니다.',
      status: 'wait',
      statusText: '수정 PR 리뷰 중',
      evidence: 'https://github.com/sgl-project/sglang/pull/41239',
    },
    {
      label: '자체 컴파일러 자체 호스팅',
      detail: '글 언어의 컴파일러가 두 세대 모두 자기 자신을 컴파일하는 고정점에 도달했습니다. 수용 테스트 194/194.',
      status: 'ok',
      statusText: 'self-hosted',
      evidence: 'https://github.com/wwoosshh/geul-lang/commit/7ff9a45',
    },
    {
      label: 'AI 개발 에이전트 운영',
      detail: '동아리 부원 5명이 쓰는 디스코드 AI 에이전트를 설계하고 운영합니다. 머지된 PR 116건.',
      status: 'ok',
      statusText: '116 PRs merged',
      evidence: 'https://github.com/semicollon-club/asahi/pulls?q=is%3Apr+is%3Amerged',
    },
  ],
  education: [
    {
      school: '청운대학교 인천캠퍼스',
      major: '컴퓨터공학과',
      period: { start: '2022-03' },
      status: '3학년 재학 중',
    },
  ],
  military: {
    period: { start: '2023-09', end: '2025-03' },
    status: '현역 복무 완료',
  },
  experience: [
    {
      org: '이루리랩스 (Iruri Labs)',
      product: '패스드림 AI · 학원용 AI 채점 SaaS',
      period: { start: '2026-06' },
      role: '프론트엔드 중심 풀스택 개발',
      employment: '개발 근로 (청운대 취업연계 국가근로)',
      bullets: [
        '하드코딩된 색상 1만여 곳을 의미 기반 디자인 토큰으로 옮기는 자동 변환(코드모드)을 만들고, 다시 들어오지 않게 커밋 전 검사를 붙였습니다.',
        '출석 코드 기능을 백엔드와 프론트엔드 모두 구현했습니다(3자리 코드, 5분 유효, 시도 횟수 제한).',
        '운영 현황 통계 모듈과 시간표 데이터 마이그레이션을 맡았습니다.',
        '학원 고객 인터뷰와 교육 박람회에 참여했습니다.',
      ],
      disclosure: 'text-only',
    },
  ],
  activities: [
    {
      name: '코딩 동아리 세미콜론 (Semicolon)',
      role: '창립 회장',
      period: { start: '2026-06' },
      bullets: [
        '동아리 회칙을 작성하고 GitHub 조직을 운영합니다.',
        '동아리 AI 개발 에이전트 asahi와 홈페이지 semicollon.com을 만들어 운영합니다.',
      ],
      links: [
        { label: 'semicollon.com', url: 'https://semicollon.com', kind: 'site' },
        { label: 'GitHub 조직', url: 'https://github.com/semicollon-club', kind: 'repo' },
      ],
    },
  ],
  howIWork: {
    principles: [
      {
        title: 'AI와 함께 만들고, 판단과 검증은 직접',
        body: 'Claude Code 같은 AI 코딩 에이전트와 협업합니다. 문제 정의, 설계 결정, 결과 검증은 제가 하고, 구현은 AI와 함께 합니다. 공동 작성 사실은 커밋에 그대로 남깁니다.',
      },
      {
        title: '설계 문서 → 계획 → 테스트 먼저',
        body: '큰 작업은 설계 문서와 구현 계획을 먼저 쓰고, 테스트를 먼저 작성한 뒤 구현합니다. 중요한 결정은 ADR로 남깁니다.',
      },
      {
        title: '믿기 전에 측정한다',
        body: '성능과 정확성에 대한 주장은 측정으로 확인하고, 가설이 틀리면 틀렸다고 기록합니다. 이 사이트의 모든 수치에도 근거 링크를 달았습니다.',
      },
    ],
    evidence: [
      {
        label: 'asahi 설계 결정 기록 (ADR 12개)',
        url: 'https://github.com/semicollon-club/asahi/tree/main/docs/decisions',
        kind: 'doc',
      },
      {
        label: 'inversa-bench: 원래 가설을 기각한 기록',
        url: 'https://github.com/wwoosshh/inversa-bench/blob/main/README.md?plain=1#L16',
        kind: 'doc',
      },
      {
        label: '이 사이트의 설계 문서와 구현 계획',
        url: 'https://github.com/wwoosshh/portfolio/tree/main/docs/superpowers',
        kind: 'doc',
      },
    ],
  },
  skills: [
    {
      group: 'AI/ML 시스템',
      items: [
        { name: 'vLLM · SGLang · transformers', projects: ['entail'] },
        { name: 'Triton', projects: ['entail'] },
      ],
    },
  ],
});
```

- [ ] **Step 6: 외부 기여 작성**

`src/data/contributions.ts`. PyTorch 항목은 `torch-compile-fuzzer` 프로젝트가 생기는 Task 13에서 추가한다.

```ts
import { contributionsSchema } from '../lib/schema';

export const contributions = contributionsSchema.parse({
  asOf: '2026-09-29',
  items: [
    {
      repo: 'vllm-project/vllm',
      kind: 'issue',
      number: 58675,
      title: '[Bug]: `--hf-overrides \'{"rope_scaling": ...}\'` drops `rope_theta` under Transformers v5; models without a per-file default silently run with base 10000',
      state: 'open',
      url: 'https://github.com/vllm-project/vllm/issues/58675',
      project: 'entail',
    },
    {
      repo: 'sgl-project/sglang',
      kind: 'issue',
      number: 41227,
      title: '[Bug] `--json-model-override-args \'{"rope_scaling": ...}\'` drops `rope_theta` for models without a per-model fallback: Llama-3.2-3B-Instruct GSM8K 161 → 106 (first 200)',
      state: 'open',
      url: 'https://github.com/sgl-project/sglang/issues/41227',
      project: 'entail',
    },
    {
      repo: 'Comfy-Org/ComfyUI',
      kind: 'issue',
      number: 16490,
      title: 'Dynamic VRAM: a ModelSamplingDiscrete schedule leaks into later runs of the same checkpoint (buffers restored by attribute path), giving wrong or black images reported as success',
      state: 'open',
      url: 'https://github.com/Comfy-Org/ComfyUI/issues/16490',
      project: 'entail',
    },
  ],
});
```

- [ ] **Step 7: 컬렉션 설정과 첫 프로젝트(Entail) 작성**

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectSchema } from './lib/schema';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.mdx' }),
  schema: projectSchema,
});

export const collections = { projects };
```

`src/content/projects/entail.mdx`:

```mdx
---
title: Entail
tagline: 모델 파일이 선언한 설정이 추론 엔진에 실제로 도달했는지 검사하고, 가능하면 첫 토큰 전에 바로잡는 파이썬 라이브러리
tier: featured
track: ml
order: 1
period:
  start: "2026-09"
  end: "2026-09"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Python, transformers, vLLM, SGLang, diffusers, Triton, GitHub Actions]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/Entail"
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: 추론 엔진이 모델 파일에 적힌 설정(RoPE base, 채팅 템플릿, stop 토큰 등)을 조용히 버리거나 다르게 읽으면, 오류 없이 틀린 답이 나옵니다.
  approach: 모델 파일이 선언한 값과 엔진이 실제로 쓰는 값을 경계마다 비교하고, 엔진의 워커 프로세스 안까지 들어가 가능하면 첫 토큰 전에 바로잡는 라이브러리를 만들었습니다.
  result: vLLM에서 GSM8K 정답이 379에서 273/500으로 떨어지는 문제를 재현하고 376으로 되돌렸습니다. 인기 LLM 180개 중 64개가 영향받는다는 것을 확인했고, vLLM·SGLang 보고는 다른 개발자들의 수정 PR로 이어졌습니다.
metrics:
  - label: vLLM에서 GSM8K 하락 재현 (Llama-3.2-3B-Instruct)
    value: 379 → 273 / 500
    evidence: "https://github.com/wwoosshh/Entail/blob/main/README.md?plain=1#L104-L108"
  - label: entail을 켰을 때
    value: 376 / 500
    evidence: "https://github.com/wwoosshh/Entail/blob/main/README.md?plain=1#L104-L108"
  - label: 설정이 조용히 버려지는 인기 LLM
    value: 64 / 180
    evidence: "https://github.com/wwoosshh/Entail/blob/main/README.md?plain=1#L13-L16"
  - label: 보고 후 다른 개발자가 올린 수정 PR
    value: 2건 (vLLM, SGLang)
    status: wait
    evidence: "https://github.com/sgl-project/sglang/pull/41239"
  - label: PyPI 릴리스
    value: 13개 (최신 2.1.1)
    evidence: "https://pypi.org/project/entail-ai/"
links:
  - label: GitHub 저장소
    url: "https://github.com/wwoosshh/Entail"
    kind: repo
  - label: PyPI entail-ai
    url: "https://pypi.org/project/entail-ai/"
    kind: package
  - label: CI 실행 기록
    url: "https://github.com/wwoosshh/Entail/actions"
    kind: ci
  - label: vLLM 수정 PR (다른 개발자)
    url: "https://github.com/vllm-project/vllm/pull/58679"
    kind: pr
  - label: SGLang 수정 PR (다른 개발자)
    url: "https://github.com/sgl-project/sglang/pull/41239"
    kind: pr
aiCollab: 커밋 119개 모두 Claude 공동 작성입니다. 무엇을 풀지 정하고, 측정을 설계하고, 결과를 검증해 상류에 보고하는 일은 직접 했고, 구현은 AI 코딩 에이전트와 함께 했습니다.
tags: [correctness, inference, llm-serving]
---

## 문제

Hugging Face의 모델 폴더는 `config.json` 같은 파일에 RoPE base, 채팅 템플릿, stop 토큰 같은 값을 선언합니다. 추론 엔진은 이 값을 읽어 모델을 돌리는데, 실행 옵션이나 라이브러리 버전이 바뀌면 값이 조용히 버려지거나 다르게 읽힐 수 있습니다. 이때 엔진은 오류를 내지 않고 틀린 답을 냅니다.

예를 들어 transformers 5 환경의 vLLM에서 `--hf-overrides`로 `rope_scaling`을 넘기면 `rope_theta`가 사라지고, 파일에 기본값이 없는 모델은 base 10000으로 돌아갑니다.

## 접근

- 모델 파일이 선언한 값과 엔진이 실제로 쓰는 값을 경계마다 비교하는 판정 체계를 만들었습니다.
- 엔진이 따로 띄우는 워커 프로세스 안까지 검사가 들어가도록 파이썬 시작 훅(`.pth`)을 썼습니다.
- "무엇을 검사할지"(규칙)와 "엔진별로 어떻게 읽을지"(어댑터)를 나누고, 이 경계를 테스트로 강제했습니다.
- 바로잡을 수 있는 경우에는 첫 토큰이 나오기 전에 값을 고칩니다.

## 결과

- vLLM 0.30에서 Llama-3.2-3B-Instruct의 GSM8K 정답이 379에서 273/500으로 떨어지는 것을 재현했고, entail을 켜면 376/500으로 돌아왔습니다.
- 다운로드가 많은 LLM 300개를 GPU 없이 vLLM 자체 설정 코드로 점검했습니다. 해당 실행 경로를 쓰는 180개 중 64개가 조용히 영향을 받았고, entail을 켜면 180개 모두 원래 값을 유지했습니다.
- vLLM과 SGLang에 보고한 이슈를 바탕으로 다른 개발자들이 수정 PR을 올렸습니다(작성 시점 기준 리뷰 중).
- 켜 두었을 때 늘어나는 요청 처리 시간은 약 1%입니다.

## 주요 결정

- 검사 항목마다 근거 수준(직접 측정했는지, 문서로만 확인했는지)을 표로 관리하고, 직접 측정한 항목만 자동 수정에 쓰도록 했습니다.
- 외부 의존성 없이 동작하게 만들어, 어떤 추론 환경에도 부담 없이 넣을 수 있게 했습니다.

## 한계와 다음 단계

- 코드를 고정한 채 실제 엔진 버그를 다시 재현한 사전 등록 실험에서는 규칙에 없던 새 버그를 잡지 못했습니다. 이 결과는 README에 그대로 공개했습니다. 지금은 알려진 유형의 설정 누락을 막는 도구에 가깝습니다.
- README 표의 여러 항목은 다른 사람이 보고한 버그로 규칙을 만든 "재현" 사례입니다.
- 측정은 모두 개인 PC의 GPU 한 장(RTX 4070 Ti)에서 했습니다.
- 외부 사용자는 아직 거의 없습니다.

## AI 협업 방식

어떤 문제를 풀지 정하고, 무엇을 어떻게 측정할지 설계하고, 결과를 확인해 상류 프로젝트에 보고하는 일은 직접 했습니다. 구현은 Claude Code와 함께 했고, 커밋 119개 모두에 공동 작성 표기가 남아 있습니다.
```

- [ ] **Step 8: 사이트 로더 작성**

`src/lib/site.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { contributions } from '../data/contributions';
import { profile } from '../data/profile';
import { checkIntegrity } from './integrity';
import type { Contribution, Contributions, Profile } from './schema';

export type ProjectEntry = CollectionEntry<'projects'>;

export interface Site {
  profile: Profile;
  contributions: Contributions;
  all: ProjectEntry[];
  featured: ProjectEntry[];
  ml: ProjectEntry[];
  agentProduct: ProjectEntry[];
  cards: ProjectEntry[];
  lines: ProjectEntry[];
  byId: Map<string, ProjectEntry>;
  contributionsFor: (projectId: string) => Contribution[];
}

export async function loadSite(): Promise<Site> {
  const all = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const errors = checkIntegrity({
    projects: all.map((p) => ({ id: p.id, tier: p.data.tier })),
    contributions: contributions.items,
    skills: profile.skills,
  });
  if (errors.length > 0) {
    throw new Error(`콘텐츠 무결성 오류:\n- ${errors.join('\n- ')}`);
  }
  const featured = all.filter((p) => p.data.tier === 'featured');
  return {
    profile,
    contributions,
    all,
    featured,
    ml: featured.filter((p) => p.data.track === 'ml'),
    agentProduct: featured.filter((p) => p.data.track === 'agent' || p.data.track === 'product'),
    cards: all.filter((p) => p.data.tier === 'card'),
    lines: all.filter((p) => p.data.tier === 'line'),
    byId: new Map(all.map((p) => [p.id, p])),
    contributionsFor: (projectId) => contributions.items.filter((c) => c.project === projectId),
  };
}
```

- [ ] **Step 9: Entail 수치를 원본과 대조**

Run:

```bash
gh api repos/wwoosshh/Entail/readme --jq .content | base64 -d | sed -n '10p;13,17p;104,108p'
curl -s https://pypi.org/pypi/entail-ai/json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.info.version,Object.keys(j.releases).length)})"
gh api "repos/wwoosshh/Entail/commits?per_page=100" --paginate --jq '.[].commit.message' | grep -c "Co-Authored-By: Claude"
```

Expected: README에 `about 1% of request time`, `64 of 180`, `379 → 273`, 표 `379 / 500 | **273 / 500** | 376 / 500`이 있다. PyPI는 `2.1.1 13`, 공동 작성 커밋 수는 `119`다. 값이 다르면 `entail.mdx`의 해당 수치와 `aiCollab`을 원본 값으로 고친다.

- [ ] **Step 10: 전체 테스트와 빌드 통과 확인**

Run: `npx vitest run && npm run build`
Expected: Vitest 전체 PASS, `astro check` `0 errors`, 빌드 성공. 빌드 중 콘텐츠 동기화가 `entail.mdx`를 스키마로 검사한다.

- [ ] **Step 11: 커밋**

```bash
git add src/lib/integrity.ts src/lib/integrity.test.ts src/lib/site.ts src/content.config.ts src/content/projects/entail.mdx src/data
git commit -m "feat: 프로젝트 컬렉션, 프로필·기여 데이터와 무결성 검사" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 디자인 토큰과 기본 레이아웃

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `public/favicon.svg`, `src/lib/style-rules.test.ts`, `tests/e2e/design.spec.ts`
- Modify: `src/pages/index.astro` (Base 레이아웃 사용)

**Interfaces:**
- Consumes: `profile` (Task 4)
- Produces:
  - CSS 변수: `--bg --surface --line --line-strong --line-hover --text --text-2 --text-3 --link --ok --wait --off --mark --font-sans --font-mono --fs-display --fs-h2 --fs-h3 --fs-body --fs-small --fs-mono --fs-tag --sp-1 --sp-2 --sp-3 --sp-4 --sp-6 --sp-8 --sp-12 --sp-16 --r-sm --r-md --w-content --w-text`
  - 공용 클래스: `.container`, `.surface`, `.surface--interactive`, `.mark`, `.mono`, `.visually-hidden`
  - `Base.astro` props: `{ title: string; description: string; noindex?: boolean }`. `<main id="content" class="container">` 안에 slot을 넣는다.

- [ ] **Step 1: 실패하는 디자인 규칙 테스트 작성**

`src/lib/style-rules.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (file: string) => path.relative(SRC, file).replaceAll('\\', '/');
const styleFiles = walk(SRC).filter((f) => /\.(astro|css)$/.test(f));
const read = (file: string) => readFileSync(file, 'utf8');

describe('디자인 규칙', () => {
  test('검사할 스타일 파일이 있다', () => {
    expect(styleFiles.map(rel)).toContain('styles/tokens.css');
  });

  test('그림자를 쓰지 않는다', () => {
    const offenders = styleFiles.filter((f) => /(box|text)-shadow\s*:(?!\s*none)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  test('색 값은 tokens.css에서만 정의한다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== 'styles/tokens.css')
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(read(f).replace(/href="[^"]*"/g, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('그라데이션은 제목 형광펜 한 곳에서만 쓴다', () => {
    const uses = styleFiles.flatMap((f) => (read(f).match(/linear-gradient\(/g) ?? []).map(() => rel(f)));
    expect(uses).toEqual(['styles/global.css']);
  });

  test('transform·transition·animation을 쓰지 않는다', () => {
    const offenders = styleFiles
      .filter((f) => /(?<![-\w])(transform|transition|animation)\s*:/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('모서리 둥글기는 토큰 두 단계와 원형 점만 쓴다', () => {
    const bad = styleFiles.flatMap((f) =>
      [...read(f).matchAll(/border-radius\s*:\s*([^;]+);/g)]
        .map((m) => m[1].trim())
        .filter((v) => !['var(--r-sm)', 'var(--r-md)', '50%'].includes(v))
        .map((v) => `${rel(f)}: ${v}`),
    );
    expect(bad).toEqual([]);
  });
});
```

`tests/e2e/design.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('바탕색과 글꼴이 토큰대로 적용된다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(250, 250, 249)');
  const loaded = await page.evaluate(() => {
    const families: string[] = [];
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') families.push(f.family.replace(/["']/g, ''));
    });
    return families;
  });
  expect(loaded).toContain('Pretendard Variable');
  expect(loaded).toContain('JetBrains Mono');
});

test('어떤 요소도 그림자가 없다', async ({ page }) => {
  await page.goto('/');
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.boxShadow !== 'none' || s.textShadow !== 'none';
      })
      .map((el) => el.tagName),
  );
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/style-rules.test.ts`
Expected: FAIL. `검사할 스타일 파일이 있다`에서 `styles/tokens.css`가 없다.

- [ ] **Step 3: 토큰과 기본 스타일 작성**

`src/styles/tokens.css`:

```css
:root {
  --bg: #fafaf9;
  --surface: #ffffff;
  --line: #e7e5e4;
  --line-strong: #d6d3d1;
  --line-hover: #a8a29e;
  --text: #1c1917;
  --text-2: #57534e;
  --text-3: #78716c;
  --link: #2563eb;
  --ok: #15803d;
  --wait: #b45309;
  --off: #78716c;
  --mark: #d9f99d;

  --font-sans: 'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, monospace;

  --fs-display: 2.25rem;
  --fs-h2: 1.5rem;
  --fs-h3: 1.125rem;
  --fs-body: 1rem;
  --fs-small: 0.875rem;
  --fs-mono: 0.75rem;
  --fs-tag: 0.6875rem;

  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;
  --sp-16: 64px;

  --r-sm: 6px;
  --r-md: 10px;

  --w-content: 960px;
  --w-text: 680px;
}
```

`src/styles/global.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: 1.65;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

h1,
h2,
h3,
p,
ul,
ol,
dl,
dd,
figure {
  margin: 0;
}

ul,
ol {
  padding: 0;
  list-style: none;
}

a {
  color: var(--link);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
}

.mono {
  font-family: var(--font-mono);
}

.container {
  max-width: var(--w-content);
  margin-inline: auto;
  padding-inline: var(--sp-6);
}

.surface {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: var(--sp-4);
}

.surface--interactive:hover {
  border-color: var(--line-hover);
}

.mark {
  background: linear-gradient(transparent 62%, var(--mark) 62%);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 767px) {
  .container {
    padding-inline: var(--sp-4);
  }
}
```

- [ ] **Step 4: 기본 레이아웃과 파비콘 작성**

`src/layouts/Base.astro`:

```astro
---
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { profile } from '../data/profile';

interface Props {
  title: string;
  description: string;
  noindex?: boolean;
}

const { title, description, noindex = false } = Astro.props;
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content="website" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <a class="skip" href="#content">본문으로 건너뛰기</a>
    <header class="site-header">
      <div class="container site-header__inner">
        <a class="site-header__home mono" href="/">~/{profile.name}</a>
        <nav aria-label="주요 섹션">
          <ul class="site-nav">
            <li><a href="/#ml">프로젝트</a></li>
            <li><a href="/#experience">경력</a></li>
            <li><a href="/#contact">연락처</a></li>
          </ul>
        </nav>
      </div>
    </header>
    <main id="content" class="container">
      <slot />
    </main>
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <span>© 2026 {profile.name}</span>
        <span>
          이 사이트는 AI 코딩 에이전트와 함께 만들었습니다 ·
          <a href="https://github.com/wwoosshh/portfolio" target="_blank" rel="noopener noreferrer">소스 ↗</a>
        </span>
      </div>
    </footer>
  </body>
</html>

<style>
  .skip {
    position: absolute;
    left: -9999px;
  }
  .skip:focus {
    left: var(--sp-4);
    top: var(--sp-4);
    background: var(--surface);
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-sm);
  }
  .site-header {
    border-bottom: 1px solid var(--line);
    background: var(--bg);
  }
  .site-header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    min-height: 56px;
  }
  .site-header__home {
    font-size: var(--fs-mono);
    color: var(--text-2);
  }
  .site-nav {
    display: flex;
    gap: var(--sp-4);
    font-size: var(--fs-small);
  }
  .site-nav a {
    color: var(--text-2);
  }
  .site-footer {
    border-top: 1px solid var(--line);
    margin-top: var(--sp-16);
  }
  .site-footer__inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--sp-2);
    padding-block: var(--sp-6);
    font-size: var(--fs-small);
    color: var(--text-3);
  }
</style>
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1c1917"/><text x="16" y="21" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#d9f99d" text-anchor="middle">~/</text></svg>
```

`src/pages/index.astro`(임시. Task 8에서 전체를 다시 쓴다):

```astro
---
import Base from '../layouts/Base.astro';
import { profile } from '../data/profile';
---
<Base title={`${profile.name} · 포트폴리오`} description={profile.intro[0]}>
  <h1><span class="mark">{profile.headline.mark}</span> {profile.headline.rest}</h1>
</Base>
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: Vitest 전체 PASS(디자인 규칙 6개 포함). Playwright의 smoke 1개와 design 2개가 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/styles src/layouts/Base.astro public/favicon.svg src/pages/index.astro src/lib/style-rules.test.ts tests/e2e/design.spec.ts
git commit -m "feat: 그림자 없는 디자인 토큰, 기본 레이아웃, 디자인 규칙 검사" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 기본 부품 (Status · Tag · Button · Evidence · SectionHeader)

**Files:**
- Create: `src/components/Status.astro`, `Tag.astro`, `Button.astro`, `Evidence.astro`, `SectionHeader.astro`, `src/components/primitives.test.ts`

**Interfaces:**
- Consumes: `StatusView`, `view` (Task 3), `shortRef` (Task 3), `Evidence` 타입 (Task 2)
- Produces (props):
  - `Status { view: StatusView }` → `<span class="status status--{tone}">`
  - `Tag` (slot) → `<span class="tag">`
  - `Button { href: string; label: string; external?: boolean; download?: string }` → `<a class="btn">`
  - `Evidence { evidence: Evidence }` → URL이면 `<a class="evidence">근거 → {shortRef} ↗</a>`, 비공개면 `<span class="evidence evidence--private">`
  - `SectionHeader { id: string; title: string; note?: string }` → `<h2 id="{id}-title" class="section-header">`

- [ ] **Step 1: 실패하는 컴포넌트 테스트 작성**

`src/components/primitives.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import { view } from '../lib/status';
import Button from './Button.astro';
import Evidence from './Evidence.astro';
import SectionHeader from './SectionHeader.astro';
import Status from './Status.astro';
import Tag from './Tag.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('Status', () => {
  test('톤 클래스, 기호, 글자를 그린다', async () => {
    const html = await container.renderToString(Status, { props: { view: view('wait', '리뷰 중') } });
    expect(html).toContain('status--wait');
    expect(html).toContain('●');
    expect(html).toContain('리뷰 중');
  });
});

describe('Tag', () => {
  test('슬롯 내용을 한 가지 모양으로 감싼다', async () => {
    const html = await container.renderToString(Tag, { slots: { default: 'Python' } });
    expect(html).toMatch(/<span class="tag"[^>]*>Python<\/span>/);
  });
});

describe('Button', () => {
  test('외부 링크는 새 탭과 ↗ 표시', async () => {
    const html = await container.renderToString(Button, {
      props: { href: 'https://github.com/wwoosshh', label: 'GitHub', external: true },
    });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('↗');
  });
  test('내려받기 버튼은 파일 이름을 붙인다', async () => {
    const html = await container.renderToString(Button, {
      props: { href: '/portfolio.pdf', label: 'PDF', download: '우성현_포트폴리오.pdf' },
    });
    expect(html).toContain('download="우성현_포트폴리오.pdf"');
    expect(html).not.toContain('target="_blank"');
  });
});

describe('Evidence', () => {
  test('URL 근거는 짧은 이름의 링크로 그린다', async () => {
    const html = await container.renderToString(Evidence, {
      props: { evidence: 'https://github.com/vllm-project/vllm/issues/58675' },
    });
    expect(html).toContain('href="https://github.com/vllm-project/vllm/issues/58675"');
    expect(html).toContain('근거 → vllm#58675');
  });
  test('비공개 근거는 링크 없이 사유를 적는다', async () => {
    const html = await container.renderToString(Evidence, {
      props: { evidence: { private: true, note: '면접에서 화면 공유로 시연' } },
    });
    expect(html).toContain('비공개 저장소 · 면접에서 화면 공유로 시연');
    expect(html).not.toContain('<a');
  });
});

describe('SectionHeader', () => {
  test('섹션 id에 맞는 h2와 // 표식을 그린다', async () => {
    const html = await container.renderToString(SectionHeader, { props: { id: 'ml', title: '대표 프로젝트' } });
    expect(html).toMatch(/<h2[^>]*id="ml-title"/);
    expect(html).toMatch(/aria-hidden="true"[^>]*>\/\/ <\/span>/);
    expect(html).toContain('대표 프로젝트');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/primitives.test.ts`
Expected: FAIL. `Failed to resolve import "./Button.astro"`.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/Status.astro`:

```astro
---
import type { StatusView } from '../lib/status';

interface Props {
  view: StatusView;
}

const { view } = Astro.props;
---
<span class:list={['status', `status--${view.tone}`]}><span aria-hidden="true">{view.symbol}</span> {view.text}</span>

<style>
  .status {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    white-space: nowrap;
  }
  .status--ok {
    color: var(--ok);
  }
  .status--wait {
    color: var(--wait);
  }
  .status--off {
    color: var(--off);
  }
</style>
```

`src/components/Tag.astro`:

```astro
---
---
<span class="tag"><slot /></span>

<style>
  .tag {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--fs-tag);
    line-height: 1.6;
    color: var(--text-2);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    padding: 0 var(--sp-2);
  }
</style>
```

`src/components/Button.astro`:

```astro
---
interface Props {
  href: string;
  label: string;
  external?: boolean;
  download?: string;
}

const { href, label, external = false, download } = Astro.props;
---
<a
  class="btn"
  href={href}
  download={download}
  target={external ? '_blank' : undefined}
  rel={external ? 'noopener noreferrer' : undefined}
>
  {label}{external && <span aria-hidden="true"> ↗</span>}{download && <span aria-hidden="true"> ↓</span>}
</a>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-sm);
    padding: var(--sp-1) var(--sp-3);
  }
  .btn:hover {
    border-color: var(--line-hover);
    text-decoration: none;
  }
</style>
```

`src/components/Evidence.astro`:

```astro
---
import { shortRef } from '../lib/format';
import type { Evidence } from '../lib/schema';

interface Props {
  evidence: Evidence;
}

const { evidence } = Astro.props;
---
{
  typeof evidence === 'string' ? (
    <a class="evidence" href={evidence} target="_blank" rel="noopener noreferrer">
      근거 → {shortRef(evidence)} <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <span class="evidence evidence--private">근거 → 비공개 저장소 · {evidence.note}</span>
  )
}

<style>
  .evidence {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
  }
  .evidence--private {
    color: var(--text-3);
  }
</style>
```

`src/components/SectionHeader.astro`:

```astro
---
interface Props {
  id: string;
  title: string;
  note?: string;
}

const { id, title, note } = Astro.props;
---
<h2 class="section-header" id={`${id}-title`}>
  <span aria-hidden="true">// </span>{title}{note && <span class="section-header__note"> — {note}</span>}
</h2>

<style>
  .section-header {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    font-weight: 400;
    color: var(--text-3);
    margin-bottom: var(--sp-3);
  }
</style>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run`
Expected: PASS. `primitives.test.ts` 7개와 디자인 규칙을 포함한 전체가 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/components
git commit -m "feat: 상태·태그·버튼·근거·섹션 제목 기본 부품" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 조합 부품 (MetricList · ProjectCard · ProjectLine · Timeline · ContributionList)

**Files:**
- Create: `src/lib/links.ts`, `src/lib/links.test.ts`, `src/lib/timeline.ts`, `src/lib/timeline.test.ts`, `src/components/MetricList.astro`, `ProjectCard.astro`, `ProjectLine.astro`, `Timeline.astro`, `ContributionList.astro`, `src/components/composites.test.ts`

**Interfaces:**
- Consumes: Task 2~6의 스키마·함수·기본 부품
- Produces:
  - `projectHref(p: { id: string; data: Project }): { href: string; external: boolean } | null`
    - featured는 `/projects/{id}/`
    - 아니면 live URL → 공개 저장소 URL → `links[0]` 순서
  - `interface TimelineItem { when: string; title: string; subtitle?: string; bullets: string[]; sortKey: string }`
  - `buildTimeline(profile: Pick<Profile, 'experience' | 'activities' | 'education' | 'military'>): TimelineItem[]` (최신순)
  - 컴포넌트 props
    - `MetricList { metrics: Metric[]; asOf: Date }`
    - `ProjectCard { project: { id: string; data: Project } }`. featured면 제목 링크에 `data-detail-link`를 붙인다.
    - `ProjectLine { project: { id: string; data: Project } }`
    - `Timeline { items: TimelineItem[] }`
    - `ContributionList { items: Contribution[]; asOf: Date }`
  - 루트 요소 표식: 카드·한 줄 항목에 `data-project="{id}"`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/links.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { projectHref } from './links';
import { projectSchema } from './schema';

const base = {
  title: 'x',
  tagline: 'x',
  tier: 'card',
  track: 'other',
  order: 1,
  period: { start: '2026-01' },
  role: '1인 개발',
  stack: ['Rust'],
  deployment: { state: 'none' },
  asOf: '2026-09-29',
  aiCollab: 'AI 협업',
};
const make = (id: string, raw: Record<string, unknown>) => ({ id, data: projectSchema.parse({ ...base, ...raw }) });

describe('projectHref', () => {
  test('대표작은 상세 페이지', () => {
    const p = make('entail', {
      tier: 'featured',
      track: 'ml',
      brief: { problem: 'p', approach: 'a', result: 'r' },
      metrics: [{ label: 'm', value: '1', evidence: 'https://github.com/wwoosshh/Entail' }],
    });
    expect(projectHref(p)).toEqual({ href: '/projects/entail/', external: false });
  });
  test('운영 중인 사이트가 있으면 사이트', () => {
    const p = make('semicollon-homepage', {
      deployment: { state: 'live', url: 'https://semicollon.com' },
      repo: { visibility: 'public', url: 'https://github.com/semicollon-club/homepage' },
    });
    expect(projectHref(p)).toEqual({ href: 'https://semicollon.com', external: true });
  });
  test('사이트가 없으면 공개 저장소', () => {
    const p = make('gitspace', { repo: { visibility: 'public', url: 'https://github.com/wwoosshh/GitSpace' } });
    expect(projectHref(p)).toEqual({ href: 'https://github.com/wwoosshh/GitSpace', external: true });
  });
  test('비공개 저장소이고 링크가 없으면 null', () => {
    const p = make('secret', { repo: { visibility: 'private' } });
    expect(projectHref(p)).toBeNull();
  });
});
```

`src/lib/timeline.test.ts`:

```ts
import { expect, test } from 'vitest';
import { buildTimeline } from './timeline';

test('경력·활동·병역·학력을 최신순으로 합친다', () => {
  const items = buildTimeline({
    experience: [
      {
        org: '이루리랩스',
        product: '패스드림 AI',
        period: { start: '2026-06' },
        role: '개발',
        employment: '근로',
        bullets: ['한 일'],
        disclosure: 'text-only',
      },
    ],
    activities: [{ name: '세미콜론', role: '창립 회장', period: { start: '2026-05' }, bullets: [], links: [] }],
    education: [{ school: '청운대학교', major: '컴퓨터공학과', period: { start: '2022-03' }, status: '재학' }],
    military: { period: { start: '2023-09', end: '2025-03' }, status: '현역 복무 완료' },
  });
  expect(items.map((i) => i.title)).toEqual(['이루리랩스', '세미콜론 · 창립 회장', '병역', '청운대학교 · 컴퓨터공학과']);
  expect(items[0]).toMatchObject({ when: '2026.06 – 현재', subtitle: '패스드림 AI · 개발 · 근로', bullets: ['한 일'] });
  expect(items[2]).toMatchObject({ when: '2023.09 – 2025.03', subtitle: '현역 복무 완료' });
});
```

`src/components/composites.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import { contributionSchema, projectSchema } from '../lib/schema';
import ContributionList from './ContributionList.astro';
import MetricList from './MetricList.astro';
import ProjectCard from './ProjectCard.astro';
import ProjectLine from './ProjectLine.astro';
import Timeline from './Timeline.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const featured = {
  id: 'entail',
  data: projectSchema.parse({
    title: 'Entail',
    tagline: '설정 검사 라이브러리',
    tier: 'featured',
    track: 'ml',
    order: 1,
    period: { start: '2026-09', end: '2026-09' },
    role: '1인 개발 · AI 코딩 에이전트 협업',
    stack: ['Python', 'vLLM', 'SGLang', 'transformers', 'Triton'],
    repo: { visibility: 'public', url: 'https://github.com/wwoosshh/Entail' },
    deployment: { state: 'none' },
    asOf: '2026-09-29',
    brief: { problem: 'p', approach: 'a', result: 'r' },
    metrics: [
      { label: 'GSM8K', value: '379 → 273 / 500', evidence: 'https://github.com/vllm-project/vllm/issues/58675' },
      { label: '수정 PR', value: '2건', status: 'wait', evidence: 'https://github.com/sgl-project/sglang/pull/41239' },
    ],
    aiCollab: 'AI 협업',
  }),
};

const downCard = {
  id: 'barun-order',
  data: projectSchema.parse({
    ...featured.data,
    title: '바른오더',
    track: 'product',
    deployment: { state: 'down', url: 'https://barun-order.com' },
  }),
};

describe('MetricList', () => {
  test('수치·근거·상태와 확인 날짜를 그린다', async () => {
    const html = await container.renderToString(MetricList, {
      props: { metrics: featured.data.metrics, asOf: featured.data.asOf },
    });
    expect(html).toContain('2026-09-29 기준');
    expect(html).toContain('379 → 273 / 500');
    expect(html).toContain('근거 → vllm#58675');
    expect(html).toContain('status--wait');
  });
});

describe('ProjectCard', () => {
  test('대표작은 상세 링크(data-detail-link)와 첫 근거, 스택 4개를 보여 준다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: featured } });
    expect(html).toContain('data-project="entail"');
    expect(html).toMatch(/href="\/projects\/entail\/"[^>]*data-detail-link/);
    expect(html).toContain('근거 → vllm#58675');
    expect(html).toContain('자세히 →');
    expect(html).toContain('transformers');
    expect(html).not.toContain('Triton');
  });
  test('서버가 꺼진 제품은 서버 중지로 표시하고 운영 중이라고 쓰지 않는다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: downCard } });
    expect(html).toContain('서버 중지');
    expect(html).not.toContain('운영 중');
  });
});

describe('ProjectLine', () => {
  test('한 줄 항목은 기간과 외부 링크를 보여 준다', async () => {
    const line = {
      id: 'gitspace',
      data: projectSchema.parse({
        title: 'GitSpace',
        tagline: 'git 이력을 3D 우주로 보여 주는 데스크톱 뷰어',
        tier: 'line',
        track: 'other',
        order: 31,
        period: { start: '2026-07', end: '2026-07' },
        role: '1인 개발',
        stack: ['Rust'],
        repo: { visibility: 'public', url: 'https://github.com/wwoosshh/GitSpace' },
        deployment: { state: 'none' },
        asOf: '2026-09-29',
        aiCollab: 'AI 협업',
      }),
    };
    const html = await container.renderToString(ProjectLine, { props: { project: line } });
    expect(html).toContain('data-project="gitspace"');
    expect(html).toContain('2026.07');
    expect(html).toContain('href="https://github.com/wwoosshh/GitSpace"');
  });
});

describe('Timeline', () => {
  test('항목마다 기간·제목·설명을 그린다', async () => {
    const html = await container.renderToString(Timeline, {
      props: {
        items: [{ when: '2026.06 – 현재', title: '이루리랩스', subtitle: '패스드림 AI', bullets: ['한 일'], sortKey: '2026-06' }],
      },
    });
    expect(html).toContain('2026.06 – 현재');
    expect(html).toMatch(/<h3[^>]*>이루리랩스<\/h3>/);
    expect(html).toContain('한 일');
  });
});

describe('ContributionList', () => {
  test('상태와 저장소#번호 링크를 그린다', async () => {
    const item = contributionSchema.parse({
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198094,
      title: '[inductor] bug',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198094',
      project: 'torch-compile-fuzzer',
      labels: ['triaged'],
    });
    const html = await container.renderToString(ContributionList, {
      props: { items: [item], asOf: new Date('2026-09-29') },
    });
    expect(html).toContain('분류됨');
    expect(html).toContain('pytorch#198094');
    expect(html).toContain('이슈');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/links.test.ts src/lib/timeline.test.ts src/components/composites.test.ts`
Expected: FAIL. `Failed to resolve import "./links"` 등.

- [ ] **Step 3: 순수 함수 구현**

`src/lib/links.ts`:

```ts
import type { Project } from './schema';

export interface ProjectTarget {
  href: string;
  external: boolean;
}

export function projectHref(project: { id: string; data: Project }): ProjectTarget | null {
  const d = project.data;
  if (d.tier === 'featured') return { href: `/projects/${project.id}/`, external: false };
  if (d.deployment.state === 'live') return { href: d.deployment.url, external: true };
  if (d.repo?.visibility === 'public') return { href: d.repo.url, external: true };
  const first = d.links[0];
  return first ? { href: first.url, external: true } : null;
}
```

`src/lib/timeline.ts`:

```ts
import { formatPeriod } from './format';
import type { Profile } from './schema';

export interface TimelineItem {
  when: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  sortKey: string;
}

export function buildTimeline(
  profile: Pick<Profile, 'experience' | 'activities' | 'education' | 'military'>,
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...profile.experience.map((e) => ({
      when: formatPeriod(e.period),
      title: e.org,
      subtitle: `${e.product} · ${e.role} · ${e.employment}`,
      bullets: e.bullets,
      sortKey: e.period.start,
    })),
    ...profile.activities.map((a) => ({
      when: formatPeriod(a.period),
      title: `${a.name} · ${a.role}`,
      bullets: a.bullets,
      sortKey: a.period.start,
    })),
    ...(profile.military
      ? [
          {
            when: formatPeriod(profile.military.period),
            title: '병역',
            subtitle: profile.military.status,
            bullets: [],
            sortKey: profile.military.period.start,
          },
        ]
      : []),
    ...profile.education.map((ed) => ({
      when: formatPeriod(ed.period),
      title: `${ed.school} · ${ed.major}`,
      subtitle: ed.status,
      bullets: [],
      sortKey: ed.period.start,
    })),
  ];
  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}
```

- [ ] **Step 4: 조합 부품 구현**

`src/components/MetricList.astro`:

```astro
---
import { formatDate } from '../lib/format';
import type { Metric } from '../lib/schema';
import { TONE_TEXT, view } from '../lib/status';
import Evidence from './Evidence.astro';
import Status from './Status.astro';

interface Props {
  metrics: Metric[];
  asOf: Date;
}

const { metrics, asOf } = Astro.props;
---
<div class="metrics surface">
  <p class="metrics__asof">{formatDate(asOf)} 기준</p>
  <ul>
    {
      metrics.map((m) => (
        <li class="metric">
          <div class="metric__row">
            <span class="metric__label">{m.label}</span>
            <span class="metric__value">{m.value}</span>
          </div>
          <div class="metric__meta">
            {m.status && <Status view={view(m.status, TONE_TEXT[m.status])} />}
            <Evidence evidence={m.evidence} />
          </div>
        </li>
      ))
    }
  </ul>
</div>

<style>
  .metrics__asof {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
    margin-bottom: var(--sp-2);
  }
  .metric {
    padding-block: var(--sp-2);
    border-bottom: 1px solid var(--line);
  }
  .metric:last-child {
    border-bottom: 0;
  }
  .metric__row {
    display: flex;
    justify-content: space-between;
    gap: var(--sp-3);
    font-size: var(--fs-small);
  }
  .metric__value {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    text-align: right;
  }
  .metric__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-top: var(--sp-1);
  }
</style>
```

`src/components/ProjectCard.astro`:

```astro
---
import { formatPeriod } from '../lib/format';
import { projectHref } from '../lib/links';
import type { Project } from '../lib/schema';
import { deploymentStatus } from '../lib/status';
import Evidence from './Evidence.astro';
import Status from './Status.astro';
import Tag from './Tag.astro';

interface Props {
  project: { id: string; data: Project };
}

const { project } = Astro.props;
const d = project.data;
const deploy = deploymentStatus(d.deployment);
const target = projectHref(project);
const isDetail = d.tier === 'featured';
const lead = d.metrics[0];
---
<article class="card surface surface--interactive" data-project={project.id}>
  <h3 class="card__title">
    {
      target ? (
        <a
          href={target.href}
          data-detail-link={isDetail ? '' : undefined}
          target={target.external ? '_blank' : undefined}
          rel={target.external ? 'noopener noreferrer' : undefined}
        >
          {d.title}
          {target.external && <span aria-hidden="true"> ↗</span>}
        </a>
      ) : (
        d.title
      )
    }
  </h3>
  {deploy && <Status view={deploy} />}
  <p class="card__meta">{formatPeriod(d.period)} · {d.role}</p>
  <p class="card__tagline">{d.tagline}</p>
  <ul class="card__tags">
    {
      d.stack.slice(0, 4).map((s) => (
        <li>
          <Tag>{s}</Tag>
        </li>
      ))
    }
  </ul>
  {
    (lead || isDetail) && (
      <div class="card__foot">
        {lead ? <Evidence evidence={lead.evidence} /> : <span />}
        {isDetail && target && (
          <a class="card__more" href={target.href}>
            자세히 →
          </a>
        )}
      </div>
    )
  }
</article>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .card__title {
    font-size: var(--fs-h3);
    font-weight: 700;
    line-height: 1.4;
  }
  .card__title a {
    color: var(--text);
  }
  .card__meta {
    font-family: var(--font-mono);
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .card__tagline {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }
  .card__foot {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin-top: auto;
    padding-top: var(--sp-2);
  }
  .card__more {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
  }
</style>
```

`src/components/ProjectLine.astro`:

```astro
---
import { formatPeriod } from '../lib/format';
import { projectHref } from '../lib/links';
import type { Project } from '../lib/schema';

interface Props {
  project: { id: string; data: Project };
}

const { project } = Astro.props;
const d = project.data;
const target = projectHref(project);
---
<li class="line" data-project={project.id}>
  <span class="line__period">{formatPeriod(d.period)}</span>
  <span class="line__body">
    {
      target ? (
        <a
          href={target.href}
          target={target.external ? '_blank' : undefined}
          rel={target.external ? 'noopener noreferrer' : undefined}
        >
          {d.title}
          {target.external && <span aria-hidden="true"> ↗</span>}
        </a>
      ) : (
        <strong>{d.title}</strong>
      )
    }
    <span class="line__tagline"> — {d.tagline}</span>
  </span>
</li>

<style>
  .line {
    display: grid;
    grid-template-columns: 9.5rem minmax(0, 1fr);
    gap: var(--sp-3);
    padding-block: var(--sp-2);
    border-bottom: 1px solid var(--line);
    font-size: var(--fs-small);
  }
  .line__period {
    font-family: var(--font-mono);
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .line__tagline {
    color: var(--text-2);
  }
  @media (max-width: 767px) {
    .line {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-1);
    }
  }
</style>
```

`src/components/Timeline.astro`:

```astro
---
import type { TimelineItem } from '../lib/timeline';

interface Props {
  items: TimelineItem[];
}

const { items } = Astro.props;
---
<ol class="timeline">
  {
    items.map((it) => (
      <li class="timeline__item">
        <p class="timeline__when">{it.when}</p>
        <h3 class="timeline__title">{it.title}</h3>
        {it.subtitle && <p class="timeline__subtitle">{it.subtitle}</p>}
        {it.bullets.length > 0 && (
          <ul class="timeline__bullets">
            {it.bullets.map((b) => (
              <li>{b}</li>
            ))}
          </ul>
        )}
      </li>
    ))
  }
</ol>

<style>
  .timeline {
    border-left: 1px solid var(--line-strong);
    padding-left: var(--sp-4);
  }
  .timeline__item {
    position: relative;
    padding-bottom: var(--sp-6);
  }
  .timeline__item:last-child {
    padding-bottom: 0;
  }
  .timeline__item::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--sp-4) - 4px);
    top: 10px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text);
  }
  .timeline__when {
    font-family: var(--font-mono);
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .timeline__title {
    font-size: var(--fs-body);
    font-weight: 700;
  }
  .timeline__subtitle {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .timeline__bullets {
    display: grid;
    gap: var(--sp-1);
    margin-top: var(--sp-2);
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .timeline__bullets li {
    position: relative;
    padding-left: var(--sp-3);
  }
  .timeline__bullets li::before {
    content: '·';
    position: absolute;
    left: 0;
    color: var(--text-3);
  }
</style>
```

`src/components/ContributionList.astro`:

```astro
---
import { formatDate } from '../lib/format';
import type { Contribution } from '../lib/schema';
import { contributionStatus } from '../lib/status';
import Status from './Status.astro';

interface Props {
  items: Contribution[];
  asOf: Date;
}

const { items, asOf } = Astro.props;
---
<div class="contribs">
  <p class="contribs__asof">{formatDate(asOf)} 기준 · 외부 저장소</p>
  <ul>
    {
      items.map((c) => (
        <li class="contrib">
          <div class="contrib__head">
            <Status view={contributionStatus(c)} />
            <a class="contrib__ref" href={c.url} target="_blank" rel="noopener noreferrer">
              {c.repo.split('/')[1]}#{c.number} <span aria-hidden="true">↗</span>
            </a>
            <span class="contrib__kind">{c.kind === 'pr' ? 'PR' : '이슈'}</span>
          </div>
          <p class="contrib__title">{c.title}</p>
        </li>
      ))
    }
  </ul>
</div>

<style>
  .contribs__asof {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
    margin-bottom: var(--sp-2);
  }
  .contrib {
    padding-block: var(--sp-2);
    border-bottom: 1px solid var(--line);
  }
  .contrib__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sp-3);
  }
  .contrib__ref,
  .contrib__kind {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
  }
  .contrib__kind {
    color: var(--text-3);
  }
  .contrib__title {
    font-size: var(--fs-small);
    color: var(--text-2);
    margin-top: var(--sp-1);
  }
</style>
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: 전체 PASS, `0 errors`.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/links.ts src/lib/links.test.ts src/lib/timeline.ts src/lib/timeline.test.ts src/components
git commit -m "feat: 수치·프로젝트 카드·한 줄 목록·타임라인·외부 기여 부품" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 홈 페이지

**Files:**
- Modify: `src/pages/index.astro` (전체 교체)
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `loadSite()` (Task 4), 모든 부품 (Task 6~7), `buildTimeline`, `projectHref`
- Produces: 홈 섹션 id `intro, highlights, ml, agent-product, experience, how-i-work, more, skills, contact`(이 순서). 대표작 카드 제목 링크에 `data-detail-link`를 붙인다.

- [ ] **Step 1: 실패하는 E2E 테스트 작성**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('홈: 섹션이 정해진 순서로 있다', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section[id]').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(['intro', 'highlights', 'ml', 'agent-product', 'experience', 'how-i-work', 'more', 'skills', 'contact']);
});

test('홈: 소개에 대표 분야와 연락 버튼이 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('정확성을 검증하는');
  await expect(page.locator('h1')).toContainText('AI/ML 시스템 엔지니어');
  await expect(page.locator('#intro a[href="https://github.com/wwoosshh"]')).toBeVisible();
  await expect(page.locator('#intro a[href="mailto:nunconnect1@gmail.com"]')).toBeVisible();
  await expect(page.locator('#intro a[href="/portfolio.pdf"]')).toHaveAttribute('download', '우성현_포트폴리오.pdf');
});

test('홈: 핵심 성과는 3~4개이고 모두 근거 링크가 있다', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#highlights li');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).locator('a.evidence')).toHaveCount(1);
  }
});

test('홈: 대표작 카드는 상세 페이지로 연결된다', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[data-detail-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).toMatch(/^\/projects\/[a-z0-9-]+\/$/);
});

test('홈: 콘솔 에러가 없다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/home.spec.ts`
Expected: FAIL. 섹션이 없다(`[]`).

- [ ] **Step 3: 홈 페이지 구현**

`src/pages/index.astro`:

```astro
---
import Button from '../components/Button.astro';
import Evidence from '../components/Evidence.astro';
import ProjectCard from '../components/ProjectCard.astro';
import ProjectLine from '../components/ProjectLine.astro';
import SectionHeader from '../components/SectionHeader.astro';
import Status from '../components/Status.astro';
import Timeline from '../components/Timeline.astro';
import Base from '../layouts/Base.astro';
import { formatDate } from '../lib/format';
import { projectHref } from '../lib/links';
import { loadSite } from '../lib/site';
import { view } from '../lib/status';
import { buildTimeline } from '../lib/timeline';

const site = await loadSite();
const { profile } = site;
const title = `${profile.name} · ${profile.headline.mark} ${profile.headline.rest}`;
const pdfName = `${profile.name}_포트폴리오.pdf`;
---
<Base title={title} description={profile.intro[0]}>
  <section id="intro" class="intro" aria-labelledby="intro-title">
    <p class="intro__kicker">~/{profile.name} · {profile.nameEn}</p>
    <h1 id="intro-title" class="intro__title">
      <span class="mark">{profile.headline.mark}</span>
      {profile.headline.rest}
    </h1>
    <div class="intro__lead">{profile.intro.map((text) => <p>{text}</p>)}</div>
    <div class="intro__actions">
      <Button href={profile.contact.github} label="GitHub" external />
      {profile.contact.email && <Button href={`mailto:${profile.contact.email}`} label="이메일" />}
      <Button href="/portfolio.pdf" label="PDF" download={pdfName} />
    </div>
  </section>

  <section id="highlights" aria-labelledby="highlights-title">
    <SectionHeader id="highlights" title="핵심 성과" note={`${formatDate(profile.asOf)} 기준`} />
    <ul class="grid">
      {
        profile.highlights.map((h) => (
          <li class="surface highlight">
            <Status view={view(h.status, h.statusText)} />
            <p class="highlight__label">{h.label}</p>
            <p class="highlight__detail">{h.detail}</p>
            <Evidence evidence={h.evidence} />
          </li>
        ))
      }
    </ul>
  </section>

  <section id="ml" aria-labelledby="ml-title">
    <SectionHeader id="ml" title="대표 프로젝트 · AI/ML 시스템과 컴파일러" />
    <div class="grid">{site.ml.map((p) => <ProjectCard project={p} />)}</div>
  </section>

  <section id="agent-product" aria-labelledby="agent-product-title">
    <SectionHeader id="agent-product" title="AI 에이전트 · 제품" />
    <div class="grid">{site.agentProduct.map((p) => <ProjectCard project={p} />)}</div>
  </section>

  <section id="experience" aria-labelledby="experience-title">
    <SectionHeader id="experience" title="경력 · 활동" />
    <Timeline items={buildTimeline(profile)} />
  </section>

  <section id="how-i-work" aria-labelledby="how-i-work-title">
    <SectionHeader id="how-i-work" title="일하는 방식" />
    <ul class="grid">
      {
        profile.howIWork.principles.map((p) => (
          <li class="surface principle">
            <h3 class="principle__title">{p.title}</h3>
            <p class="principle__body">{p.body}</p>
          </li>
        ))
      }
    </ul>
    <ul class="evidence-list">
      {
        profile.howIWork.evidence.map((l) => (
          <li>
            <a href={l.url} target="_blank" rel="noopener noreferrer">
              {l.label} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))
      }
    </ul>
  </section>

  <section id="more" aria-labelledby="more-title">
    <SectionHeader id="more" title="그 밖의 프로젝트" />
    <div class="grid">{site.cards.map((p) => <ProjectCard project={p} />)}</div>
    {site.lines.length > 0 && <ul class="lines">{site.lines.map((p) => <ProjectLine project={p} />)}</ul>}
  </section>

  <section id="skills" aria-labelledby="skills-title">
    <SectionHeader id="skills" title="기술 스택" note="프로젝트로 증명된 것만" />
    <dl class="skills">
      {
        profile.skills.map((group) => (
          <div class="skills__group">
            <dt>{group.group}</dt>
            <dd>
              <ul>
                {group.items.map((item) => (
                  <li class="skill">
                    <span class="skill__name">{item.name}</span>
                    <span class="skill__projects">
                      {item.projects.map((id) => {
                        const p = site.byId.get(id)!;
                        const target = projectHref(p);
                        return target ? (
                          <a
                            href={target.href}
                            target={target.external ? '_blank' : undefined}
                            rel={target.external ? 'noopener noreferrer' : undefined}
                          >
                            {p.data.title}
                          </a>
                        ) : (
                          <span>{p.data.title}</span>
                        );
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))
      }
    </dl>
  </section>

  <section id="contact" aria-labelledby="contact-title">
    <SectionHeader id="contact" title="연락처" />
    <ul class="contact">
      {
        profile.contact.email && (
          <li>
            <span class="contact__label">이메일</span>
            <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
          </li>
        )
      }
      <li>
        <span class="contact__label">GitHub</span>
        <a href={profile.contact.github} target="_blank" rel="noopener noreferrer">
          {profile.contact.github.replace('https://', '')}
        </a>
      </li>
    </ul>
  </section>
</Base>

<style>
  section + section {
    margin-top: var(--sp-16);
  }
  .intro {
    padding-top: var(--sp-16);
  }
  .intro__kicker {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  .intro__title {
    font-size: var(--fs-display);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin-top: var(--sp-2);
  }
  .intro__lead {
    display: grid;
    gap: var(--sp-2);
    max-width: var(--w-text);
    margin-top: var(--sp-4);
    color: var(--text-2);
  }
  .intro__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    margin-top: var(--sp-6);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-2);
  }
  .highlight {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .highlight__label {
    font-weight: 700;
  }
  .highlight__detail,
  .principle__body {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .principle__title {
    font-size: var(--fs-body);
    font-weight: 700;
    margin-bottom: var(--sp-1);
  }
  .evidence-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2) var(--sp-4);
    margin-top: var(--sp-3);
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
  }
  .lines {
    margin-top: var(--sp-4);
    border-top: 1px solid var(--line);
  }
  .skills {
    display: grid;
    gap: var(--sp-4);
  }
  .skills__group dt {
    font-weight: 700;
    margin-bottom: var(--sp-1);
  }
  .skill {
    display: grid;
    grid-template-columns: 16rem minmax(0, 1fr);
    gap: var(--sp-3);
    padding-block: var(--sp-1);
    border-bottom: 1px solid var(--line);
    font-size: var(--fs-small);
  }
  .skill__projects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1) var(--sp-3);
  }
  .contact {
    display: grid;
    gap: var(--sp-2);
  }
  .contact li {
    display: flex;
    gap: var(--sp-3);
  }
  .contact__label {
    width: 5rem;
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  @media (max-width: 767px) {
    section + section {
      margin-top: var(--sp-12);
    }
    .intro {
      padding-top: var(--sp-12);
    }
    .intro__title {
      font-size: 1.75rem;
    }
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .skill {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-1);
    }
  }
</style>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS. home 5개, design 2개, smoke 1개가 통과한다.

- [ ] **Step 5: 화면 확인**

Run: `npm run preview`로 서버를 띄운 뒤 브라우저에서 `http://localhost:4321/`를 폭 1280과 390으로 열어 본다. 그림자가 없는지, 카드 모양이 하나인지, 한글 줄바꿈이 어절 단위인지 확인한다. 확인이 끝나면 서버를 끈다.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/index.astro tests/e2e/home.spec.ts
git commit -m "feat: 홈 페이지 9개 섹션" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 대표작 상세 페이지

**Files:**
- Create: `src/pages/projects/[id].astro`, `tests/e2e/project.spec.ts`

**Interfaces:**
- Consumes: `loadSite()`, `render` (`astro:content`), `MetricList`, `ContributionList`, `Status`, `Tag`, `deploymentStatus`, `formatPeriod`
- Produces: `/projects/{id}/` (featured만). h2 순서: `핵심 수치` → MDX의 `문제`·`접근`·`결과`·`주요 결정`·`한계와 다음 단계`·`AI 협업 방식` → (있으면) `외부 PR · 이슈` → `링크`

- [ ] **Step 1: 실패하는 E2E 테스트 작성**

`tests/e2e/project.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const ORDER = ['핵심 수치', '문제', '접근', '결과', '주요 결정', '한계와 다음 단계', 'AI 협업 방식', '링크'];

test('대표작 상세 페이지는 정해진 구성과 근거를 갖춘다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  const hrefs = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator('h1'), href).toHaveCount(1);
    const headings = (await page.locator('main h2').allInnerTexts()).map((t) => t.trim());
    expect(headings.filter((t) => ORDER.includes(t)), href).toEqual(ORDER);
    expect(await page.locator('.metric .evidence').count(), href).toBeGreaterThan(0);
    expect(await page.locator('main').innerText(), href).toContain('AI 코딩 에이전트');
  }
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/project.spec.ts`
Expected: FAIL. `/projects/entail/`의 응답이 404다.

- [ ] **Step 3: 상세 페이지 구현**

`src/pages/projects/[id].astro`:

```astro
---
import { render } from 'astro:content';
import ContributionList from '../../components/ContributionList.astro';
import MetricList from '../../components/MetricList.astro';
import Status from '../../components/Status.astro';
import Tag from '../../components/Tag.astro';
import Base from '../../layouts/Base.astro';
import { formatPeriod } from '../../lib/format';
import { loadSite, type ProjectEntry } from '../../lib/site';
import { deploymentStatus } from '../../lib/status';

export async function getStaticPaths() {
  const site = await loadSite();
  return site.featured.map((project) => ({ params: { id: project.id }, props: { project } }));
}

interface Props {
  project: ProjectEntry;
}

const { project } = Astro.props;
const site = await loadSite();
const d = project.data;
const { Content } = await render(project);
const deploy = deploymentStatus(d.deployment);
const deployUrl = d.deployment.state === 'none' ? undefined : d.deployment.url;
const contribs = site.contributionsFor(project.id);
const back = d.track === 'ml' ? '/#ml' : '/#agent-product';
const LINK_KIND = {
  repo: '저장소',
  pr: 'PR',
  issue: '이슈',
  package: '패키지',
  site: '사이트',
  video: '영상',
  doc: '문서',
  ci: 'CI',
} as const;
---
<Base title={`${d.title} · ${site.profile.name}`} description={d.tagline}>
  <article class="detail">
    <p class="detail__back"><a href={back}>← 모든 프로젝트</a></p>
    <h1 class="detail__title">{d.title}</h1>
    <p class="detail__tagline">{d.tagline}</p>

    <dl class="detail__summary surface">
      <div>
        <dt>기간</dt>
        <dd>{formatPeriod(d.period)}</dd>
      </div>
      <div>
        <dt>역할</dt>
        <dd>{d.role}</dd>
      </div>
      <div>
        <dt>저장소</dt>
        <dd>
          {
            d.repo?.visibility === 'public' ? (
              <a href={d.repo.url} target="_blank" rel="noopener noreferrer">
                {d.repo.url.replace('https://github.com/', '')} <span aria-hidden="true">↗</span>
              </a>
            ) : d.repo ? (
              '비공개 저장소'
            ) : (
              '없음'
            )
          }
        </dd>
      </div>
      {
        deploy && (
          <div>
            <dt>상태</dt>
            <dd>
              <Status view={deploy} />
              {deployUrl && (
                <>
                  {' · '}
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer">
                    {new URL(deployUrl).hostname.replace(/^www\./, '')} <span aria-hidden="true">↗</span>
                  </a>
                </>
              )}
            </dd>
          </div>
        )
      }
      <div>
        <dt>스택</dt>
        <dd>
          <ul class="detail__tags">
            {
              d.stack.map((s) => (
                <li>
                  <Tag>{s}</Tag>
                </li>
              ))
            }
          </ul>
        </dd>
      </div>
    </dl>

    <section class="detail__section" aria-labelledby="metrics-title">
      <h2 id="metrics-title">핵심 수치</h2>
      <MetricList metrics={d.metrics} asOf={d.asOf} />
    </section>

    <div class="prose">
      <Content />
    </div>

    {
      contribs.length > 0 && (
        <section class="detail__section" aria-labelledby="contribs-title">
          <h2 id="contribs-title">외부 PR · 이슈</h2>
          <ContributionList items={contribs} asOf={site.contributions.asOf} />
        </section>
      )
    }

    <section class="detail__section" aria-labelledby="links-title">
      <h2 id="links-title">링크</h2>
      <ul class="detail__links">
        {
          d.links.map((l) => (
            <li>
              <span class="detail__link-kind">{LINK_KIND[l.kind]}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))
        }
      </ul>
    </section>
  </article>
</Base>

<style>
  .detail {
    padding-top: var(--sp-12);
    max-width: var(--w-text);
  }
  .detail__back {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
  }
  .detail__title {
    font-size: var(--fs-display);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin-top: var(--sp-4);
  }
  .detail__tagline {
    color: var(--text-2);
    margin-top: var(--sp-2);
  }
  .detail__summary {
    display: grid;
    gap: var(--sp-2);
    margin-top: var(--sp-6);
    font-size: var(--fs-small);
  }
  .detail__summary > div {
    display: grid;
    grid-template-columns: 5rem minmax(0, 1fr);
    gap: var(--sp-3);
  }
  .detail__summary dt {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  .detail__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }
  .detail__section h2,
  .prose :global(h2) {
    font-size: var(--fs-h2);
    font-weight: 700;
    margin-top: var(--sp-12);
    margin-bottom: var(--sp-3);
  }
  .prose :global(p) {
    margin-top: var(--sp-3);
  }
  .prose :global(ul) {
    display: grid;
    gap: var(--sp-2);
    margin-top: var(--sp-3);
  }
  .prose :global(li) {
    position: relative;
    padding-left: var(--sp-4);
  }
  .prose :global(li)::before {
    content: '·';
    position: absolute;
    left: var(--sp-1);
    color: var(--text-3);
  }
  .prose :global(code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    padding: 0 var(--sp-1);
  }
  .detail__links {
    display: grid;
    gap: var(--sp-2);
    font-size: var(--fs-small);
  }
  .detail__links li {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: var(--sp-3);
  }
  .detail__link-kind {
    font-family: var(--font-mono);
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  @media (max-width: 767px) {
    .detail__title {
      font-size: 1.75rem;
    }
  }
</style>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS. project 1개(entail 페이지 검사)가 추가로 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add "src/pages/projects/[id].astro" tests/e2e/project.spec.ts
git commit -m "feat: 대표작 상세 페이지(핵심 수치·본문·외부 기여·링크)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 반응형·접근성 검사

**Files:**
- Create: `tests/e2e/layout.spec.ts`
- Modify: 검사에서 드러난 문제가 있는 컴포넌트·페이지의 `<style>`만

**Interfaces:**
- Consumes: 홈과 상세 페이지 (Task 8~9)
- Produces: 폭 390·834·1280px에서 가로 스크롤이 없고 콘솔 에러가 0인 것을 보장하는 테스트, 제목 계층·포커스·대체 텍스트 검사

- [ ] **Step 1: 테스트 작성**

`tests/e2e/layout.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const WIDTHS = [390, 834, 1280];

async function routes(page: Page): Promise<string[]> {
  await page.goto('/');
  const details = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  return ['/', ...details];
}

for (const width of WIDTHS) {
  test(`폭 ${width}px에서 가로 스크롤과 콘솔 에러가 없다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    for (const path of await routes(page)) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} @${width}`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

test('제목 계층: h1은 하나이고 단계를 건너뛰지 않는다', async ({ page }) => {
  for (const path of await routes(page)) {
    await page.goto(path);
    const levels = await page.locator('h1, h2, h3, h4').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels.filter((l) => l === 1), path).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `${path}: h${levels[i - 1]} 다음 h${levels[i]}`).toBeLessThanOrEqual(1);
    }
  }
});

test('키보드 포커스가 보인다', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(outline).toBe('solid 2px');
});

test('모든 이미지에 대체 텍스트가 있다', async ({ page }) => {
  for (const path of await routes(page)) {
    await page.goto(path);
    const missing = await page.locator('img:not([alt])').count();
    expect(missing, path).toBe(0);
  }
});
```

- [ ] **Step 2: 실행**

Run: `npm run test:e2e -- tests/e2e/layout.spec.ts`
Expected: 대부분 PASS. 실패한 항목이 있으면 메시지에 나온 경로와 폭을 확인한다.

- [ ] **Step 3: 실패 항목만 고친다**

- **가로 넘침이 생기면:** 넘치는 요소를 찾는다.
  `document.querySelectorAll('*')`에서 `getBoundingClientRect().right > innerWidth`인 요소를 브라우저 콘솔로 확인한다. 그 컴포넌트의 스타일에 `min-width: 0`, `minmax(0, 1fr)`, `overflow-wrap: anywhere` 중 필요한 것을 더한다.
- **제목 단계를 건너뛰면:** `h4` 이하를 `h3`로 바꾸거나, 스타일만 필요한 곳은 `p`로 바꾼다.

고친 뒤 Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS.

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/layout.spec.ts src
git commit -m "test: 반응형·제목 계층·포커스·대체 텍스트 검사" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 인쇄 페이지와 PDF

**Files:**
- Create: `src/layouts/Print.astro`, `src/components/ProjectBrief.astro`, `src/pages/print.astro`, `scripts/make-pdf.mjs`, `tests/e2e/print.spec.ts`, `public/portfolio.pdf`(생성)

**Interfaces:**
- Consumes: `loadSite()`, `buildTimeline`, `projectHref`, `shortRef`, `formatDate`, `formatPeriod`, `contributionStatus`, `view`, `Status`, `Evidence`
- Produces:
  - `/print/`: `noindex`, A4. 전화번호 빈 칸 `<li data-private-slot="phone" hidden></li>`
  - `ProjectBrief { project: { id: string; data: Project }; size: 'half' | 'quarter' }`
  - `node scripts/make-pdf.mjs`(→ `public/portfolio.pdf`)
  - `node scripts/make-pdf.mjs --private`(→ `C:\Portpolio\private\우성현_포트폴리오_제출용.pdf`)
  - 두 명령 모두 4장을 넘으면 실패한다.

- [ ] **Step 1: 실패하는 E2E 테스트 작성**

`tests/e2e/print.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

test('인쇄 페이지는 A4 4장 이하 PDF가 된다', async ({ page }) => {
  await page.goto('/print/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const doc = await PDFDocument.load(pdf);
  expect(doc.getPageCount()).toBeLessThanOrEqual(4);
});

test('인쇄 페이지는 검색 엔진 색인을 막는다', async ({ page }) => {
  await page.goto('/print/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('공개 빌드의 전화번호 칸은 비어 있고 숨겨져 있다', async ({ page }) => {
  await page.goto('/print/');
  const slot = page.locator('[data-private-slot="phone"]');
  await expect(slot).toHaveCount(1);
  await expect(slot).toBeHidden();
  await expect(slot).toHaveText('');
});

test('공개 페이지 어디에도 전화번호 형식 문자열이 없다', async ({ page, request }) => {
  await page.goto('/');
  const details = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  for (const path of ['/', '/print/', ...details]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(PHONE);
  }
});

test('모든 내부 링크가 200으로 응답한다', async ({ page, request }) => {
  const queue = ['/'];
  const seen = new Set<string>();
  const bad: string[] = [];
  while (queue.length > 0) {
    const path = queue.pop() as string;
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await request.get(path);
    if (response.status() !== 200) {
      bad.push(`${response.status()} ${path}`);
      continue;
    }
    if (!(response.headers()['content-type'] ?? '').includes('text/html')) continue;
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href') as string));
    for (const href of hrefs) {
      const clean = href.split('#')[0];
      if (clean && !seen.has(clean)) queue.push(clean);
    }
  }
  expect(bad).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/print.spec.ts`
Expected: FAIL. `/print/`가 404이고, `/portfolio.pdf`도 404다.

- [ ] **Step 3: 인쇄 레이아웃과 요약 부품 작성**

`src/layouts/Print.astro`:

```astro
---
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '../styles/tokens.css';
import '../styles/global.css';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>{title}</title>
  </head>
  <body class="print">
    <main>
      <slot />
    </main>
  </body>
</html>

<style is:global>
  @page {
    size: A4;
    margin: 16mm;
  }
  body.print {
    background: var(--surface);
    font-size: 12px;
    line-height: 1.5;
  }
  .print main {
    max-width: 178mm;
    margin-inline: auto;
  }
  .print .page {
    break-after: page;
  }
  .print .page:last-child {
    break-after: auto;
  }
  .print h1 {
    font-size: 22px;
    font-weight: 800;
  }
  .print .headline {
    display: block;
    font-size: 16px;
    font-weight: 700;
    margin-top: var(--sp-1);
  }
  .print h2 {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    color: var(--text-3);
    margin: var(--sp-4) 0 var(--sp-2);
    padding-bottom: var(--sp-1);
    border-bottom: 1px solid var(--line);
  }
  .print .kicker,
  .print .when {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-3);
  }
  .print .lead {
    color: var(--text-2);
    margin-top: var(--sp-1);
  }
  .print .contact {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1) var(--sp-4);
    margin-top: var(--sp-2);
    font-family: var(--font-mono);
    font-size: 11px;
  }
  .print .grid2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--sp-2);
  }
  .print .box {
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: var(--sp-2) var(--sp-3);
    break-inside: avoid;
  }
  .print .strong {
    font-weight: 700;
  }
  .print .small {
    font-size: 11px;
    color: var(--text-2);
  }
  .print .tl > li,
  .print .lines > li {
    display: grid;
    grid-template-columns: 30mm minmax(0, 1fr);
    gap: var(--sp-3);
    padding-block: var(--sp-1);
    break-inside: avoid;
  }
  .print .lines > li {
    border-bottom: 1px solid var(--line);
  }
  .print .bullets {
    display: grid;
    gap: var(--sp-1);
    font-size: 11px;
    color: var(--text-2);
  }
  .print .stack {
    display: grid;
    gap: var(--sp-3);
  }
  .print .skills {
    display: grid;
    gap: var(--sp-1);
  }
  .print .contribs > li {
    display: grid;
    grid-template-columns: 24mm 32mm minmax(0, 1fr);
    gap: var(--sp-2);
    align-items: baseline;
  }
  .print .contribs .small {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .print .footnote {
    margin-top: var(--sp-4);
    font-size: 10.5px;
    color: var(--text-3);
  }
</style>
```

`src/components/ProjectBrief.astro`:

```astro
---
import { formatPeriod } from '../lib/format';
import type { Project } from '../lib/schema';
import { deploymentStatus } from '../lib/status';
import Evidence from './Evidence.astro';
import Status from './Status.astro';

interface Props {
  project: { id: string; data: Project };
  size: 'half' | 'quarter';
}

const { project, size } = Astro.props;
const d = project.data;
const deploy = deploymentStatus(d.deployment);
const metrics = d.metrics.slice(0, size === 'half' ? 3 : 2);
---
<article class:list={['brief', `brief--${size}`]} data-project={project.id}>
  <header class="brief__head">
    <h3 class="brief__title">{d.title}</h3>
    {deploy && <Status view={deploy} />}
    <p class="brief__meta">{formatPeriod(d.period)} · {d.role} · {d.stack.slice(0, 5).join(', ')}</p>
  </header>
  {
    d.brief && (
      <dl class="brief__body">
        <div>
          <dt>문제</dt>
          <dd>{d.brief.problem}</dd>
        </div>
        <div>
          <dt>접근</dt>
          <dd>{d.brief.approach}</dd>
        </div>
        <div>
          <dt>결과</dt>
          <dd>{d.brief.result}</dd>
        </div>
      </dl>
    )
  }
  <ul class="brief__metrics">
    {
      metrics.map((m) => (
        <li>
          <span>{m.label}</span> <strong class="mono">{m.value}</strong> <Evidence evidence={m.evidence} />
        </li>
      ))
    }
  </ul>
</article>

<style>
  .brief {
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: var(--sp-3);
    break-inside: avoid;
  }
  .brief__head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sp-1) var(--sp-2);
  }
  .brief__title {
    font-size: 14px;
    font-weight: 700;
  }
  .brief__meta {
    flex-basis: 100%;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-3);
  }
  .brief__body {
    display: grid;
    gap: var(--sp-1);
    margin-top: var(--sp-2);
  }
  .brief__body > div {
    display: grid;
    grid-template-columns: 10mm minmax(0, 1fr);
    gap: var(--sp-2);
  }
  .brief__body dt {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-3);
  }
  .brief__metrics {
    display: grid;
    gap: var(--sp-1);
    margin-top: var(--sp-2);
    font-size: 11px;
  }
</style>
```

- [ ] **Step 4: 인쇄 페이지 작성**

`src/pages/print.astro`:

```astro
---
import Evidence from '../components/Evidence.astro';
import ProjectBrief from '../components/ProjectBrief.astro';
import Status from '../components/Status.astro';
import Print from '../layouts/Print.astro';
import { formatDate, formatPeriod, shortRef } from '../lib/format';
import { projectHref } from '../lib/links';
import { loadSite } from '../lib/site';
import { contributionStatus, view } from '../lib/status';
import { buildTimeline } from '../lib/timeline';

const site = await loadSite();
const { profile } = site;
const timeline = buildTimeline(profile);
const strip = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const more = [...site.cards, ...site.lines];
---
<Print title={`${profile.name} 포트폴리오`}>
  <section class="page">
    <header>
      <p class="kicker">{profile.nameEn}</p>
      <h1>
        {profile.name}
        <span class="headline"><span class="mark">{profile.headline.mark}</span> {profile.headline.rest}</span>
      </h1>
      {profile.intro.map((t) => <p class="lead">{t}</p>)}
      <ul class="contact">
        {profile.contact.email && <li><a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a></li>}
        <li><a href={profile.contact.github}>{strip(profile.contact.github)}</a></li>
        {profile.contact.site && <li><a href={profile.contact.site}>{strip(profile.contact.site)}</a></li>}
        <li data-private-slot="phone" hidden></li>
      </ul>
    </header>

    <h2>핵심 성과 · {formatDate(profile.asOf)} 기준</h2>
    <ul class="grid2">
      {
        profile.highlights.map((h) => (
          <li class="box">
            <Status view={view(h.status, h.statusText)} />
            <p class="strong">{h.label}</p>
            <p class="small">{h.detail}</p>
            <Evidence evidence={h.evidence} />
          </li>
        ))
      }
    </ul>

    <h2>경력 · 활동</h2>
    <ol class="tl">
      {
        timeline.map((t) => (
          <li>
            <span class="when">{t.when}</span>
            <div>
              <p class="strong">{t.title}</p>
              {t.subtitle && <p class="small">{t.subtitle}</p>}
              {t.bullets.length > 0 && (
                <ul class="bullets">
                  {t.bullets.map((b) => (
                    <li>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))
      }
    </ol>

    <h2>일하는 방식</h2>
    <ul class="bullets">
      {profile.howIWork.principles.map((p) => <li><span class="strong">{p.title}</span> — {p.body}</li>)}
    </ul>
  </section>

  <section class="page">
    <h2>대표 프로젝트 · AI/ML 시스템과 컴파일러</h2>
    <div class="stack">{site.ml.map((p) => <ProjectBrief project={p} size="half" />)}</div>
  </section>

  <section class="page">
    <h2>AI 에이전트 · 제품</h2>
    <div class="stack">{site.agentProduct.map((p) => <ProjectBrief project={p} size="quarter" />)}</div>
  </section>

  <section class="page">
    <h2>그 밖의 프로젝트</h2>
    <ul class="lines">
      {
        more.map((p) => {
          const target = projectHref(p);
          return (
            <li>
              <span class="when">{formatPeriod(p.data.period)}</span>
              <span>
                <span class="strong">{p.data.title}</span> — {p.data.tagline}
                {target && target.external && (
                  <>
                    {' · '}
                    <a href={target.href}>{shortRef(target.href)}</a>
                  </>
                )}
              </span>
            </li>
          );
        })
      }
    </ul>

    <h2>기술 스택</h2>
    <ul class="skills">
      {profile.skills.map((g) => <li><span class="strong">{g.group}</span> — {g.items.map((i) => i.name).join(', ')}</li>)}
    </ul>

    <h2>외부 기여 · {formatDate(site.contributions.asOf)} 기준</h2>
    <ul class="contribs">
      {
        site.contributions.items.map((c) => (
          <li>
            <Status view={contributionStatus(c)} />
            <a href={c.url}>{shortRef(c.url)}</a>
            <span class="small">{c.title}</span>
          </li>
        ))
      }
    </ul>
    <p class="footnote">
      모든 수치의 근거 링크는 웹 포트폴리오에서 확인할 수 있습니다. AI 코딩 에이전트와 협업한 사실은 각 프로젝트에 밝혀 두었습니다.
    </p>
  </section>
</Print>
```

- [ ] **Step 5: PDF 생성 스크립트 작성**

`scripts/make-pdf.mjs`:

```js
// 사용법: node scripts/make-pdf.mjs            → public/portfolio.pdf (공개용, 전화번호 없음)
//         node scripts/make-pdf.mjs --private  → ../private/ 에 제출용 PDF (전화번호 포함, 저장소 밖)
// 먼저 astro build가 끝나 있어야 한다(npm run pdf / npm run pdf:private가 빌드까지 한다).
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import { PDFDocument } from 'pdf-lib';

const root = fileURLToPath(new URL('..', import.meta.url));
const privateDir = path.resolve(root, '..', 'private');
const isPrivate = process.argv.includes('--private');
const MAX_PAGES = 4;

async function readPhone() {
  const file = path.join(privateDir, 'contact.json');
  if (!existsSync(file)) {
    throw new Error(`제출용 PDF에는 ${file} 가 필요합니다. 형식: {"phone": "010-0000-0000"}`);
  }
  const { phone } = JSON.parse(await readFile(file, 'utf8'));
  if (typeof phone !== 'string' || !/^01[016789]-\d{3,4}-\d{4}$/.test(phone)) {
    throw new Error('contact.json의 phone은 010-0000-0000 형식이어야 합니다.');
  }
  return phone;
}

const server = await preview({ root, server: { port: 4399 } });
try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${server.port}/print/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  if (isPrivate) {
    const phone = await readPhone();
    await page.evaluate((value) => {
      const slot = document.querySelector('[data-private-slot="phone"]');
      if (!slot) throw new Error('전화번호 칸(data-private-slot="phone")이 없습니다.');
      slot.textContent = value;
      slot.removeAttribute('hidden');
    }, phone);
  }

  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await browser.close();

  const pages = (await PDFDocument.load(pdf)).getPageCount();
  if (pages > MAX_PAGES) throw new Error(`PDF가 ${pages}장입니다. 최대 ${MAX_PAGES}장이어야 합니다.`);

  const out = isPrivate
    ? path.join(privateDir, '우성현_포트폴리오_제출용.pdf')
    : path.join(root, 'public', 'portfolio.pdf');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, pdf);
  console.log(`저장: ${out} (${pages}장)`);
} finally {
  await server.stop();
}
```

- [ ] **Step 6: 공개용 PDF 생성**

Run: `npm run pdf`
Expected: `저장: C:\Portpolio\site\public\portfolio.pdf (N장)`, N ≤ 4.

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS. print 5개가 추가로 통과한다.

- [ ] **Step 8: 커밋**

```bash
git add src/layouts/Print.astro src/components/ProjectBrief.astro src/pages/print.astro scripts/make-pdf.mjs tests/e2e/print.spec.ts public/portfolio.pdf
git commit -m "feat: A4 인쇄 페이지와 공개용·제출용 PDF 생성" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 외부 링크 검사와 CI

**Files:**
- Create: `scripts/check-links.mjs`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: 빌드 결과 `dist/` (Task 11까지)
- Produces:
  - `npm run check:links`: 모든 외부 링크를 확인하고, 깨진 링크가 있으면 종료 코드 1로 끝난다. 429는 경고만 한다.
  - GitHub Actions `CI`: `npm test` → `npm run build` → Playwright

- [ ] **Step 1: 링크 검사 스크립트 작성**

`scripts/check-links.mjs`:

```js
// dist/의 모든 HTML에서 외부 링크를 모아 응답을 확인한다. 먼저 npm run build.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

const urls = new Set();
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) urls.add(m[1].replaceAll('&amp;', '&'));
}

async function check(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
        headers: { 'user-agent': 'portfolio-link-check' },
      });
      return { url, status: res.status };
    } catch (error) {
      if (attempt === 2) return { url, status: 0, error: String(error) };
    }
  }
}

const queue = [...urls];
const results = [];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length > 0) results.push(await check(queue.shift()));
  }),
);

results.sort((a, b) => a.url.localeCompare(b.url));
for (const r of results) console.log(`${String(r.status || 'ERR').padEnd(4)} ${r.url}`);
const warn = results.filter((r) => r.status === 429);
const bad = results.filter((r) => r.status !== 429 && (r.status < 200 || r.status >= 400));
if (warn.length > 0) console.warn(`\n경고: 요청 제한(429) ${warn.length}개. 잠시 뒤 다시 실행해 확인하세요.`);
if (bad.length > 0) {
  console.error(`\n깨진 링크 ${bad.length}개`);
  process.exit(1);
}
console.log(`\n외부 링크 ${results.length}개 확인 완료`);
```

- [ ] **Step 2: 실행해서 확인**

Run: `npm run build && npm run check:links`
Expected: 마지막 줄이 `외부 링크 N개 확인 완료`이다. 깨진 링크가 나오면 해당 URL을 콘텐츠에서 고치고 다시 실행한다. 이 시점의 링크는 Entail과 프로필의 링크뿐이다.

- [ ] **Step 3: CI 작성**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
```

- [ ] **Step 4: 로컬에서 CI와 같은 순서로 실행**

Run: `npm ci && npm test && npm run build && npx playwright test`
Expected: 모두 성공한다. 실제 CI는 Task 17에서 푸시한 뒤 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add scripts/check-links.mjs .github/workflows/ci.yml
git commit -m "ci: 외부 링크 검사 스크립트와 GitHub Actions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 콘텐츠 — AI/ML 시스템 대표작 3개와 PyTorch 기여

**Files:**
- Create: `src/content/projects/torch-compile-fuzzer.mdx`, `geul-lang.mdx`, `inversa-bench.mdx`
- Modify: `src/data/contributions.ts`(PyTorch 12개 추가), `src/data/profile.ts`(skills에 새 프로젝트 반영)

**Interfaces:**
- Consumes: 스키마 (Task 2), id 표 (파일 구조)
- Produces: featured/ml 프로젝트 `torch-compile-fuzzer`(order 2), `geul-lang`(3), `inversa-bench`(4). `contributions.items`에 PyTorch 이슈 6개와 PR 6개(`project: 'torch-compile-fuzzer'`)

**콘텐츠 규칙:** 아래 확인 단계에서 원본과 다른 값이 나오면 원본 값으로 고친다. 확인할 수 없는 문장은 **지운다**(추측으로 채우지 않는다).

- [ ] **Step 1: 원본 확인**

Run:

```bash
gh api repos/wwoosshh/AI-accelerator-compiler/contents/fuzz/README.md --jq .content | base64 -d | sed -n '1,12p'
gh api "repos/wwoosshh/AI-accelerator-compiler/git/trees/main?recursive=1" --jq '.tree[].path' | grep -E '^fuzz/(experiments|patches|upstream)/' | head -40
for n in 198094 198095 198100 198101 198102 198131; do gh issue view $n -R pytorch/pytorch --json number,state,labels --jq '"#\(.number) \(.state) \([.labels[].name]|join(","))"'; done
for n in 198096 198097 198103 198104 198105 198132; do gh pr view $n -R pytorch/pytorch --json number,state --jq '"#\(.number) \(.state)"'; done
gh api "repos/wwoosshh/AI-accelerator-compiler/commits?per_page=100" --paginate --jq '.[].commit.message' | grep -c "Co-Authored-By: Claude"; gh api "repos/wwoosshh/AI-accelerator-compiler/commits?per_page=100" --paginate --jq '.[].sha' | wc -l
gh run list -R wwoosshh/geul-lang --limit 300 --json conclusion --jq 'group_by(.conclusion) | map("\(.[0].conclusion)=\(length)") | join(" ")'
gh api "repos/wwoosshh/geul-lang/contents/%EC%99%84%EC%84%B1-%EA%B8%B0%EB%A1%9D-2026-09-21.md?ref=v2" --jq .content | base64 -d | sed -n '10p;14p'
gh api "repos/wwoosshh/geul-lang/contents/docs/02-%EC%84%A4%EA%B3%84%EA%B2%B0%EC%A0%95-%EA%B8%B0%EB%A1%9D.md?ref=v2" --jq .content | base64 -d | grep -nE "D-30|D-31|결함|20" | head -20
gh api repos/wwoosshh/inversa-bench/readme --jq .content | base64 -d | sed -n '15,18p'
```

Expected:
- 퍼저 README 4~5행에 "약 21,000개 프로그램(45분)", "신규 조용한 오답 7계열"이 있다.
- `fuzz/experiments/` 아래에 NNSmith 비교(E1/E2)와 오라클 절제(E3) 결과가 있다. 비교 결과 파일을 열어 "NNSmith 의미 버그 0건, aliasfuzz 고유 원인 6계열"과 "출력만 비교하면 약 30% 누락"을 확인한다.
- PyTorch 이슈 6개가 OPEN이고 모두 `triaged`다. 198100을 뺀 5개에 `module: correctness (silent)`가 있다.
- PR은 198105만 CLOSED이고 나머지 5개는 OPEN이다.
- geul-lang CI의 `success` 횟수를 확인한다.
- 완성 기록 10·14행에 자체 호스팅과 "수용 테스트 194개"가 있다.
- 설계결정 기록에서 D-30(조사로 인자 검사)과 D-31(상수 접기 기각, 인라인 채택)을 확인한다.
- inversa README 15~18행에 `+3.2%`, `Spearman +0.93`, `59개 모델`이 있다.

- [ ] **Step 2: `torch-compile-fuzzer.mdx` 작성**

```mdx
---
title: torch.compile 정합성 퍼저 + PyTorch 수정
tagline: 별칭·뷰·in-place 연산에 특화한 차등 퍼저로 torch.compile이 오류 없이 틀린 값을 내는 버그를 찾아, PyTorch에 보고하고 수정 PR을 올렸습니다
tier: featured
track: ml
order: 2
period:
  start: "2026-09"
  end: "2026-09"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Python, PyTorch, torch.compile, Dynamo, AOTAutograd, Inductor, Triton, C++]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/AI-accelerator-compiler"
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: torch.compile은 별칭(같은 메모리를 가리키는 텐서)·뷰·in-place 변경이 섞인 코드를 최적화하다가 오류 없이 eager 실행과 다른 값을 내는 경우가 있습니다.
  approach: 반환값뿐 아니라 별칭 구조, 입력의 최종 상태, 부작용까지 eager 실행과 비교하는 차등 퍼저를 만들고, 정수 값으로 허용오차 0 비교를 했습니다.
  result: 약 21,000개 프로그램에서 새로운 조용한 오답 7계열을 찾아 PyTorch 이슈 6건(모두 분류됨)과 수정 PR 6건(5건 리뷰 중)을 올렸습니다.
metrics:
  - label: 실행한 프로그램 (torch 2.14.0)
    value: 약 21,000개 · 45분
    evidence: "https://github.com/wwoosshh/AI-accelerator-compiler/blob/main/fuzz/README.md?plain=1#L4-L5"
  - label: 새로 찾은 조용한 오답 계열 (나이틀리 재현)
    value: 7개
    evidence: "https://github.com/wwoosshh/AI-accelerator-compiler/blob/main/fuzz/README.md?plain=1#L4-L5"
  - label: PyTorch 이슈 (메인테이너 분류)
    value: 6 / 6 triaged
    status: ok
    evidence: "https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh"
  - label: PyTorch 수정 PR
    value: 5건 리뷰 중 · 1건 닫힘
    status: wait
    evidence: "https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh"
links:
  - label: GitHub 저장소
    url: "https://github.com/wwoosshh/AI-accelerator-compiler"
    kind: repo
  - label: 퍼저 설명 (aliasfuzz)
    url: "https://github.com/wwoosshh/AI-accelerator-compiler/blob/main/fuzz/README.md"
    kind: doc
  - label: 비교 실험 (NNSmith 대 aliasfuzz, 오라클 절제)
    url: "https://github.com/wwoosshh/AI-accelerator-compiler/tree/main/fuzz/experiments"
    kind: doc
  - label: PyTorch에 올린 PR 목록
    url: "https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh"
    kind: pr
aiCollab: 오라클을 어떻게 설계할지, 어떤 불일치를 버그로 판정할지, 원인이 어디 있는지 규명하고 메인테이너 리뷰에 대응하는 일은 직접 했습니다. 퍼저와 패치 구현은 AI 코딩 에이전트와 함께 했습니다.
tags: [correctness, compiler, pytorch, fuzzing]
---

## 문제

`torch.compile`은 파이썬으로 쓴 PyTorch 코드를 그래프로 바꿔 최적화합니다. 이 과정에서 같은 메모리를 가리키는 텐서(별칭), 뷰, in-place 변경이 섞이면, 컴파일된 코드가 오류 없이 eager 실행과 다른 값을 내는 경우가 있습니다. 이런 "조용한 오답"은 학습이나 추론 결과를 망가뜨려도 눈에 띄지 않습니다.

## 접근

- 별칭·뷰·in-place 연산 조합에 집중한 작은 프로그램 생성기와 차등 오라클(aliasfuzz)을 만들었습니다.
- 반환값만 비교하지 않고, 별칭 구조, 입력 텐서의 최종 상태, 부작용까지 eager 실행과 비교합니다.
- 정수 값을 써서 허용오차 0으로 비교하고, 정의되지 않은 동작은 생성 단계에서 뺐습니다.
- 같은 프로그램을 Dynamo만, aot_eager, Inductor(Triton) 세 경로로 돌려 어느 단계에서 틀어지는지 좁혔습니다.

## 결과

- torch 2.14.0에서 약 21,000개 프로그램(45분)을 돌려, 나이틀리에서도 재현되는 새로운 조용한 오답 7계열을 찾았습니다.
- 원인을 코드 위치까지 규명해 PyTorch에 이슈 6건을 올렸고, 6건 모두 메인테이너가 분류했습니다. 5건에는 `module: correctness (silent)` 라벨이 붙었습니다.
- 수정 PR 6건에는 모두 회귀 테스트를 넣었습니다. 5건은 메인테이너 리뷰를 반영하며 진행 중이고, 1건은 이슈에서 먼저 논의하라는 절차 안내로 닫혔습니다.

## 주요 결정

- 같은 20분 예산으로 기존 퍼저 NNSmith와 비교했습니다. NNSmith가 보고한 불일치는 모두 수치 오차였고, aliasfuzz는 서로 다른 원인 6계열을 찾았습니다.
- 오라클에서 반환값 비교만 남기면 불일치의 약 30%를 놓친다는 것을 절제 실험으로 확인해, 별칭 구조와 입력 상태 비교를 유지했습니다.

## 한계와 다음 단계

- 작성 시점 기준으로 머지된 PR은 없습니다. 리뷰를 계속 반영하고 있습니다.
- 저장소 이름이 실제 내용(퍼저와 조사 문서)과 맞지 않아 정리할 예정입니다.

## AI 협업 방식

오라클 설계, 버그 판정 기준, 원인 규명, 메인테이너 리뷰 대응은 직접 했습니다. 퍼저와 패치 구현은 Claude Code와 함께 했습니다.
```

- [ ] **Step 3: `geul-lang.mdx` 작성**

Step 1에서 확인한 CI 성공 횟수를 `78회 모두 성공` 자리에 넣는다.

```mdx
---
title: 글(Geul) 프로그래밍 언어
tagline: 한국어 어순과 조사를 문법으로 쓰는 시스템 언어. 글로 쓴 컴파일러가 자기 자신을 컴파일하고, LLVM이나 C 컴파일러 없이 x86-64 실행 파일을 직접 만듭니다
tier: featured
track: ml
order: 3
period:
  start: "2026-03"
  end: "2026-09"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [글, Python, x86-64, PE32+, GitHub Actions]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/geul-lang"
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: 한국어로 코드를 쓰는 언어는 대부분 인터프리터이거나 다른 언어로 번역해 실행해서, 한국어 문법을 제대로 쓰거나 스스로를 컴파일하지 못합니다.
  approach: 조사(격)가 인자의 역할을 정하는 언어를 설계하고, 파이썬 참조 구현과 글로 쓴 자체 컴파일러를 함께 키우며 두 결과를 바이트 단위로 비교했습니다.
  result: LLVM·C 컴파일러 없이 x86-64 PE를 직접 만들고, 두 세대 모두 자체 호스팅 고정점에 도달했습니다. 수용 테스트 194/194를 통과했습니다.
metrics:
  - label: 자체 호스팅 (1세대)
    value: 2026-04-02 고정점 달성
    evidence: "https://github.com/wwoosshh/geul-lang/commit/5c8ab0a"
  - label: 자체 호스팅 (2세대)
    value: 1·2·3세대 출력 바이트 동일
    evidence: "https://github.com/wwoosshh/geul-lang/commit/7ff9a45"
  - label: 수용 테스트 (참조 구현·자체 컴파일러 양쪽)
    value: 194 / 194
    evidence: "https://github.com/wwoosshh/geul-lang/blob/v2/%EC%99%84%EC%84%B1-%EA%B8%B0%EB%A1%9D-2026-09-21.md?plain=1#L14"
  - label: CI
    value: 78회 모두 성공
    status: ok
    evidence: "https://github.com/wwoosshh/geul-lang/actions"
links:
  - label: GitHub 저장소
    url: "https://github.com/wwoosshh/geul-lang"
    kind: repo
  - label: 설계 결정 기록 (D-01 ~ D-45)
    url: "https://github.com/wwoosshh/geul-lang/blob/v2/docs/02-%EC%84%A4%EA%B3%84%EA%B2%B0%EC%A0%95-%EA%B8%B0%EB%A1%9D.md"
    kind: doc
  - label: 완성 기록
    url: "https://github.com/wwoosshh/geul-lang/blob/v2/%EC%99%84%EC%84%B1-%EA%B8%B0%EB%A1%9D-2026-09-21.md"
    kind: doc
  - label: CI 실행 기록
    url: "https://github.com/wwoosshh/geul-lang/actions"
    kind: ci
aiCollab: 언어 설계와 문법 결정, 참조 구현과 바이트를 비교하는 검증 방식, 완성 선언 같은 방향 결정은 직접 했습니다. 구현은 AI 코딩 에이전트와 함께 했고, 대부분의 커밋에 공동 작성 표기가 있습니다.
tags: [compiler, language-design, correctness]
---

## 문제

한국어로 코드를 쓰는 언어는 대부분 인터프리터이거나 다른 언어로 번역해 실행합니다. 한국어의 어순과 조사를 문법으로 제대로 쓰거나, 스스로를 컴파일해 실행 파일을 만드는 언어는 드뭅니다.

## 접근

- 조사(격)가 인자의 역할을 정하는 SOV 어순 문법을 설계했습니다. 같은 타입의 인자를 바꿔 넣어도 조사가 맞지 않으면 컴파일 오류가 납니다.
- 파이썬 참조 구현과, 글로 쓴 자체 컴파일러를 함께 키웠습니다. 두 컴파일러의 토큰·AST·IR 덤프와 실행 파일 바이트를 비교하며 단계적으로 옮겼습니다.
- LLVM이나 C 컴파일러 없이 x86-64 명령을 직접 인코딩하고, PE32+ 실행 파일을 직접 씁니다. 런타임도 C 런타임 없이 글로 썼습니다.
- 설계 결정은 D-01부터 D-45까지 기록으로 남겼습니다.

## 결과

- 1세대(2026-04-02)와 2세대(2026-09-03) 모두 자체 호스팅 고정점에 도달했습니다. 2세대는 1·2·3세대 컴파일러의 출력 바이트가 같습니다.
- 수용 테스트 194개를 참조 구현과 자체 컴파일러 양쪽에서 모두 통과했습니다.
- 다른 개발자가 TypeScript 포팅 포크를 만들었습니다.

## 주요 결정

- 측정해 보니 대상이 거의 없는 최적화(상수 접기)는 넣지 않고, 효과가 큰 인라인 확장을 택했습니다.
- 활용 방향 세 가지가 모두 "왜 새 언어여야 하는가"라는 질문을 통과하지 못하자, 1.2.0에서 완성을 선언하고 기능 추가를 멈췄습니다.

## 한계와 다음 단계

- 전역 상수식의 나눗셈처럼 참조 구현과 실행 결과가 다른 알려진 결함이 남아 있습니다.
- 실사용자는 없습니다.

## AI 협업 방식

언어 설계와 문법 결정, 참조 구현과 바이트를 비교하는 검증 방식, 완성 선언 같은 방향 결정은 직접 했습니다. 구현은 Claude Code와 함께 했습니다.
```

- [ ] **Step 4: `inversa-bench.mdx` 작성**

```mdx
---
title: inversa-bench
tagline: 답을 먼저 주고 그 답이 나오는 문제를 "구성"하게 하는 수학 벤치마크. sympy로 기계 채점하고 LLM 심판을 쓰지 않습니다
tier: featured
track: ml
order: 4
period:
  start: "2026-06"
  end: "2026-06"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Python, sympy, Rasch IRT, 부트스트랩 신뢰구간, OpenRouter]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/inversa-bench"
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: 공개 수학 벤치마크는 학습 데이터에 유출돼 점수가 부풀고, 모델이 강해지면 포화됩니다.
  approach: 답에서 문제로 가는 역방향 과제를 매번 새로 생성하고 sympy로 채점해, 유출될 고정 문항과 주관적 채점을 없앴습니다.
  result: 모델 59개 리더보드를 만들고, 기존 벤치마크의 오염 효과 +3.2%와 AIME와의 순위 상관 +0.93을 측정했습니다. 원래 가설은 기각하고 그대로 보고했습니다.
metrics:
  - label: 평가한 모델
    value: 59개 · 7개 패밀리
    evidence: "https://github.com/wwoosshh/inversa-bench/blob/main/README.md?plain=1#L18"
  - label: 기존 벤치마크의 오염 효과
    value: "+3.2% (95% CI +1.0 ~ +5.7)"
    evidence: "https://github.com/wwoosshh/inversa-bench/blob/main/README.md?plain=1#L15"
  - label: AIME와 순위 상관 (Spearman)
    value: "+0.93"
    evidence: "https://github.com/wwoosshh/inversa-bench/blob/main/README.md?plain=1#L16"
links:
  - label: GitHub 저장소
    url: "https://github.com/wwoosshh/inversa-bench"
    kind: repo
aiCollab: 가설 설정, 실험 설계, 통계 해석과 가설 기각 판단은 직접 했습니다. 구현 일부는 AI 코딩 에이전트와 함께 했습니다.
tags: [evaluation, llm, statistics]
---

## 문제

공개된 수학 벤치마크는 학습 데이터에 유출되어 점수가 부풀려지고, 모델이 강해지면 만점 근처로 포화됩니다. LLM으로 채점하면 채점 자체의 신뢰도도 문제가 됩니다.

## 접근

- "문제 → 답"이 아니라 "답 → 그 답이 나오는 문제"를 구성하게 하는 역방향 과제를 만들었습니다.
- 과제를 매번 무작위 입력으로 새로 만들어 유출될 고정 문항을 없앴고, 난이도는 프로그램으로 올립니다.
- 모델이 만든 문제를 sympy로 기계 검증해 채점합니다. 사람이나 LLM 심판은 쓰지 않습니다.
- Rasch 모형과 부트스트랩 신뢰구간으로 결과를 해석했습니다.

## 결과

- 모델들을 온도 0으로 측정해 59개 모델, 7개 패밀리의 리더보드를 만들었습니다.
- 유출된 GSM8K와 같은 난이도의 새 문항(GSM-Symbolic)을 비교해, 기존 벤치마크의 오염 효과가 +3.2%(95% CI +1.0 ~ +5.7)라는 것을 측정했습니다. 역방향 과제에서는 체계적인 차이가 없었습니다.
- 어려운 벤치마크인 AIME와의 순위 상관(Spearman)이 +0.93으로, 같은 수학 능력을 재는 도구임을 확인했습니다.

## 주요 결정

- 처음 세운 가설은 "문제를 구성하는 능력은 푸는 능력과 별개"였지만, 데이터가 이를 뒷받침하지 않아 기각하고 그대로 보고했습니다. 이 벤치마크의 가치는 별개 능력이 아니라 오염에 면역이고 자동으로 확장된다는 데 있다고 정리했습니다.

## 한계와 다음 단계

- 평가 대상이 API로 접근할 수 있는 모델로 한정됩니다.
- 수학 영역에만 적용했습니다.

## AI 협업 방식

가설 설정, 실험 설계, 통계 해석과 가설 기각 판단은 직접 했습니다. 구현 일부는 Claude Code와 함께 했습니다.
```

- [ ] **Step 5: PyTorch 기여 추가**

`src/data/contributions.ts`의 `items` 배열 끝(ComfyUI 항목 다음)에 아래 12개를 추가한다.

```ts
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198094,
      title: '[inductor] Scatter result reinplaced into a graph input that a later, unrelated mutation overwrites: y = slice_scatter(x, src); x.zero_(); return y returns zeros',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198094',
      project: 'torch-compile-fuzzer',
      labels: ['triaged', 'module: correctness (silent)'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198096,
      title: '[inductor] Do not reinplace into a graph input that a later, unrelated mutation overwrites',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/pull/198096',
      project: 'torch-compile-fuzzer',
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198095,
      title: '[aot_autograd] Output that is a view of an aliased input (synthetic base) is regenerated from the wrong tensor: ta[0] returns t0[0], ta.view(-1) asserts on ViewMeta shape',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198095',
      project: 'torch-compile-fuzzer',
      labels: ['triaged', 'module: correctness (silent)'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198097,
      title: '[aot_autograd] Regenerate output aliases of merged (synthetic-base) inputs from metadata',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/pull/198097',
      project: 'torch-compile-fuzzer',
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198100,
      title: '[dynamo] x.contiguous().unsqueeze_(d) / x.to(x.dtype).unsqueeze_(d) crashes guard creation with IndexError: list index out of range (in-place view through a no-op alias of the input)',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198100',
      project: 'torch-compile-fuzzer',
      labels: ['triaged'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198103,
      title: '[dynamo] Graph break on an in-place view of a no-op alias of a graph input',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/pull/198103',
      project: 'torch-compile-fuzzer',
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198101,
      title: '[inductor] Consumer of a dtype view of an input is computed after a later in-place mutation of that input (y = x.view(int32) * 2; y.sub_(-4); x[:, 2:5] = 2; return y.view(int64))',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198101',
      project: 'torch-compile-fuzzer',
      labels: ['triaged', 'module: correctness (silent)'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198104,
      title: '[inductor] Realize consumers of aliasing buffers before a mutation of the aliased buffer',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/pull/198104',
      project: 'torch-compile-fuzzer',
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198102,
      title: '[functionalization] In-place mutation through a gapped unfold view (step > size) silently zeroes every base element not covered by a window under torch.compile',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198102',
      project: 'torch-compile-fuzzer',
      labels: ['triaged', 'module: correctness (silent)'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198105,
      title: '[functionalization] unfold inverse: keep base elements that no window covers',
      state: 'closed',
      url: 'https://github.com/pytorch/pytorch/pull/198105',
      project: 'torch-compile-fuzzer',
      note: '이슈에서 먼저 논의하라는 절차 안내',
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 198131,
      title: "[inductor] `dst[:] = src[:]; src.add_(1)` copies the *updated* `src` into `dst` (remove_noop_ops replaces a copy of an input by the input itself, which is mutated before the copy's user runs)",
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/198131',
      project: 'torch-compile-fuzzer',
      labels: ['triaged', 'module: correctness (silent)'],
    },
    {
      repo: 'pytorch/pytorch',
      kind: 'pr',
      number: 198132,
      title: "[inductor] remove_noop_ops: keep a copy of an input that is mutated before the copy's user runs",
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/pull/198132',
      project: 'torch-compile-fuzzer',
    },
```

Step 1에서 상태나 라벨이 달라졌으면 그 값으로 적는다(예: 머지됐으면 `state: 'merged'`).

- [ ] **Step 6: 기술 스택에 새 프로젝트 반영**

`src/data/profile.ts`의 `skills`를 다음으로 바꾼다. Task 15에서 전체 목록으로 다시 바꾼다.

```ts
  skills: [
    {
      group: 'AI/ML 시스템',
      items: [
        { name: 'PyTorch · torch.compile', projects: ['torch-compile-fuzzer'] },
        { name: 'vLLM · SGLang · transformers', projects: ['entail'] },
        { name: 'Triton', projects: ['entail', 'torch-compile-fuzzer'] },
        { name: 'LLM 평가 설계 (sympy 검증, 통계)', projects: ['inversa-bench'] },
      ],
    },
    {
      group: '언어 · 컴파일러',
      items: [
        { name: 'Python', projects: ['entail', 'torch-compile-fuzzer', 'inversa-bench', 'geul-lang'] },
        { name: 'x86-64 코드 생성 · PE 실행 파일', projects: ['geul-lang'] },
      ],
    },
  ],
```

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS. 상세 페이지 테스트가 새 대표작 3개도 검사한다.

- [ ] **Step 8: 커밋**

```bash
git add src/content/projects src/data
git commit -m "content: ML 대표작 3개(퍼저·글·inversa-bench)와 PyTorch 기여" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 콘텐츠 — AI 에이전트·제품 대표작 4개

**Files:**
- Create: `src/content/projects/asahi.mdx`, `barun-order.mdx`, `mzcube.mdx`, `nogada-rpg.mdx`

**Interfaces:**
- Consumes: 스키마, id 표
- Produces: featured 프로젝트 `asahi`(agent, 5), `barun-order`(product, 6), `mzcube`(product, 7), `nogada-rpg`(product, 8, 비공개 저장소)

**콘텐츠 규칙:** Task 13과 같다. 확인할 수 없는 문장은 지운다. nogada는 스크린샷을 넣지 않는다(재배포가 금지된 그래픽 에셋).
- YAML 값에 ` #`(공백 뒤 #)이 있으면 주석으로 잘리므로 값 전체를 큰따옴표로 감싼다.
- YAML 값이 따옴표나 `+` 숫자로 시작하면 값 전체를 큰따옴표로 감싼다.

- [ ] **Step 1: 원본 확인**

Run:

```bash
gh pr list -R semicollon-club/asahi --state merged --limit 300 --json author --jq 'length as $n | "merged=\($n) mine=\([.[]|select(.author.login=="wwoosshh")]|length)"'
gh api "repos/semicollon-club/asahi/contents/docs/decisions" --jq '[.[] | select(.name | test("^[0-9]{4}-"))] | length'
gh api "repos/semicollon-club/asahi/contents/docs/superpowers/specs/2026-09-22-usability-roadmap-design.md" --jq .content | base64 -d | sed -n '40,44p'
gh pr view 115 -R semicollon-club/asahi --json title,state --jq '"\(.state) \(.title)"'
for s in f586b65 6a771b9 d3f299f 90ce78a 8838a41; do gh api repos/wwoosshh/clearly-backend/commits/$s --jq '"\(.sha[0:7]) \(.commit.message | split("\n")[0])"'; done
gh api "repos/wwoosshh/clearly-backend/commits?per_page=100" --paginate --jq '.[].sha' | wc -l
gh api "repos/wwoosshh/clearly-backend/commits?per_page=100" --paginate --jq '.[].commit.message' | grep -c "Co-Authored-By: Claude"
gh api "repos/wwoosshh/clearly-backend/git/trees/main?recursive=1" --jq '[.tree[].path | select(test("\\.module\\.ts$"))] | length'
gh api repos/wwoosshh/clearly-backend/contents/prisma/schema.prisma --jq .content | base64 -d | grep -c "^model "
gh api "repos/wwoosshh/foodiemap-website/deployments?per_page=100" --paginate --jq '.[] | .environment' | sort | uniq -c
gh api "repos/wwoosshh/foodiemap-website/commits?per_page=100" --paginate --jq '.[].sha' | wc -l
gh run list -R wwoosshh/nogada-rpg-server --limit 100 --json conclusion --jq 'group_by(.conclusion) | map("\(.[0].conclusion)=\(length)") | join(" ")'
gh api "repos/wwoosshh/nogada-rpg-server/commits?per_page=100" --paginate --jq '.[].sha' | wc -l
gh api "repos/wwoosshh/nogada-rpg-server/git/trees/main?recursive=1" --jq '[.tree[].path | select(test("\\.test\\.tsx?$"))] | length'
```

Expected:
- asahi: `merged=116 mine=114`, ADR 12개. 로드맵 43행에 `부원 5명 전원`이 있고, PR #115는 MERGED다.
- clearly-backend: 커밋 5개의 제목이 아래 수치와 맞고, 커밋 수와 Claude 공동 작성 수를 확인한다. 모듈 파일 수와 Prisma `model` 수를 본문의 "20개 모듈, 22개 모델"과 비교해 다르면 고친다.
- foodiemap: Production 배포가 `302`다. 커밋 수를 확인한다.
- nogada: CI 성공·실패 횟수, 커밋 수, 테스트 파일 수를 본문의 "27회 중 26회", "409개", "125개"와 비교해 다르면 고친다.

nogada의 코드와 테스트 줄 수는 얕게 클론해서 센다. 클론은 저장소 밖 임시 폴더에 두고, 확인 뒤 지운다.

```bash
T=$(mktemp -d) && git clone -q --depth 1 https://github.com/wwoosshh/nogada-rpg-server.git "$T/n" && cd "$T/n" && \
  echo "code: $(git ls-files '*.ts' '*.tsx' | grep -vE '\.test\.tsx?$' | xargs cat | wc -l)" && \
  echo "test: $(git ls-files '*.test.ts' '*.test.tsx' | xargs cat | wc -l)"; cd /c/Portpolio/site; rm -rf "$T"
```

Expected: `code`와 `test`가 각각 약 36.5K, 36.7K줄이다. 다르면 본문 값을 고친다.

- [ ] **Step 2: `asahi.mdx` 작성**

```mdx
---
title: asahi — 동아리 AI 개발 에이전트
tagline: 동아리 디스코드에 상주하며 부원들의 개발 작업을 돕는 AI 에이전트. 봇과 실행 워커를 나누고 권한·보안 경계를 설계했습니다
tier: featured
track: agent
order: 5
period:
  start: "2026-07"
role: 설계·개발·운영 (동아리 창립 회장) · AI 코딩 에이전트 협업
stack: [TypeScript, Node.js, Claude Agent SDK, MCP, discord.js, WebSocket, PostgreSQL, Vitest]
repo:
  visibility: public
  url: "https://github.com/semicollon-club/asahi"
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: 동아리 부원들이 개발하다 막힐 때 도움받을 곳이 없었고, 공용 PC에서 AI 에이전트를 돌리면 공개 채널의 메시지가 PC의 명령 실행으로 이어질 수 있었습니다.
  approach: 디스코드·DB·LLM을 맡는 봇과 토큰 하나만 가진 실행 워커를 분리하고, 경로 이중 검사·읽기 전용 DB 트랜잭션·저장소 하나·1시간짜리 토큰으로 권한을 좁혔습니다.
  result: 최근 30일 동안 부원 5명이 모두 사용했고, PR 116건이 머지됐습니다. 운영 중 생긴 문제와 결정을 설계 결정 기록(ADR) 12개로 남겼습니다.
metrics:
  - label: 머지된 PR (그중 본인 114건)
    value: 116건
    status: ok
    evidence: "https://github.com/semicollon-club/asahi/pulls?q=is%3Apr+is%3Amerged"
  - label: 설계 결정 기록 (ADR)
    value: 12개
    evidence: "https://github.com/semicollon-club/asahi/tree/main/docs/decisions"
  - label: 최근 30일 사용한 부원
    value: 5명 전원
    evidence: "https://github.com/semicollon-club/asahi/blob/main/docs/superpowers/specs/2026-09-22-usability-roadmap-design.md?plain=1#L40-L43"
links:
  - label: GitHub 저장소
    url: "https://github.com/semicollon-club/asahi"
    kind: repo
  - label: 설계 결정 기록
    url: "https://github.com/semicollon-club/asahi/tree/main/docs/decisions"
    kind: doc
  - label: "사용량 기록 결함 수정 (PR #115)"
    url: "https://github.com/semicollon-club/asahi/pull/115"
    kind: pr
aiCollab: 아키텍처와 보안 경계 설계, 운영 결정(ADR), 장애 진단은 직접 했습니다. 구현은 AI 코딩 에이전트와 함께 했고, 커밋의 대부분에 공동 작성 표기가 있습니다.
tags: [agent, llm, security, mcp]
---

## 문제

동아리 부원들이 개발하다 막힐 때 바로 물어볼 곳이 없었습니다. 동아리 공용 PC에서 AI 에이전트를 돌리면 편하지만, 공개 채널의 메시지가 공용 PC의 명령 실행으로 이어질 수 있어 권한과 보안 설계가 필요했습니다.

## 접근

- 디스코드·DB·LLM을 맡는 봇과, 토큰 하나만 가진 실행 워커를 분리했습니다. 워커는 WebSocket 허브에 해시된 토큰으로 인증합니다.
- 권한을 좁히는 장치를 여러 겹으로 뒀습니다. 파일 경로 이중 검사, 정적 SQL 검사와 읽기 전용 DB 트랜잭션, 저장소 하나에 1시간만 유효한 GitHub App 토큰입니다.
- MCP로 GitHub·DB 조회, 파일 전송, 브라우저 같은 도구를 붙였습니다.
- LLM 호출은 프록시를 거쳐 모델을 고정하고, 사용량을 기록하고, 부원별 사용 한도를 둡니다.
- 중요한 결정은 ADR로, 알려진 위험은 위험 등록부로 관리합니다.

## 결과

- 최근 30일 동안 부원 5명이 모두 사용했습니다.
- PR 116건이 머지됐고, 그중 114건을 직접 올렸습니다. CI는 Ubuntu와 Windows에서 돕니다.
- 운영 중 생긴 문제를 진단해 고쳤습니다. 예를 들어 사용량 기록이 한 번도 남지 않던 결함은, DB 통계로 "기록 시도 자체가 없었다"는 것을 먼저 확인한 뒤 압축 응답과 JSON 응답 처리라는 두 원인을 고쳤습니다(PR #115).

## 주요 결정

- 배포처를 클라우드에서 동아리 미니PC로 옮기면서, 봇은 얇게 두고 무거운 작업은 워커로 보냈습니다(ADR 0006).
- 부원 사이 격리를 어설프게 만드는 대신, 격리가 없다는 사실을 문서로 명시하고 손님에게는 공용 기계임을 알리기로 했습니다(ADR 0009).

## 한계와 다음 단계

- 사용자는 동아리 안의 소수이고, 운영이 한 사람에게 집중되어 있습니다.

## AI 협업 방식

아키텍처와 보안 경계 설계, 운영 결정(ADR), 장애 진단은 직접 했습니다. 구현은 Claude Code와 함께 했습니다.
```

- [ ] **Step 3: `barun-order.mdx` 작성**

```mdx
---
title: 바른오더 — 이사청소 매칭 플랫폼
tagline: 이사청소 견적 비교와 업체 매칭, 실시간 채팅, 구독 요금제, 관리자 기능을 갖춘 웹 서비스와 모바일 앱
tier: featured
track: product
order: 6
period:
  start: "2026-01"
  end: "2026-03"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [NestJS, Next.js, Prisma, PostgreSQL, Redis, Socket.IO, Expo, Vercel, Railway]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/clearly-backend"
deployment:
  state: down
  url: "https://barun-order.com"
asOf: 2026-09-29
brief:
  problem: 이사청소 업체를 고를 때 소비자는 견적을 비교하기 어렵고, 업체가 믿을 만한지 판단할 정보도 부족합니다.
  approach: 견적 요청부터 업체 제안, 비교, 채팅, 매칭까지 이어지는 흐름을 NestJS로 만들고, 웹(Next.js)과 모바일 앱(Expo)이 같은 API를 쓰게 했습니다.
  result: 고객 관리 화면의 N+1 쿼리를 4N+3개에서 7개로 줄이고, OAuth 토큰 노출을 임시 코드 교환으로 막았습니다. 현재 서버는 중지 상태입니다.
metrics:
  - label: 고객 관리 화면 쿼리 수
    value: 4N+3 → 7
    evidence: "https://github.com/wwoosshh/clearly-backend/commit/f586b65"
  - label: OAuth 콜백의 토큰 URL 노출 수정
    value: 임시 코드 교환 방식
    evidence: "https://github.com/wwoosshh/clearly-backend/commit/6a771b9"
  - label: Redis 캐시 적용
    value: 8개 서비스
    evidence: "https://github.com/wwoosshh/clearly-backend/commit/8838a41"
links:
  - label: 백엔드 저장소
    url: "https://github.com/wwoosshh/clearly-backend"
    kind: repo
  - label: 웹 저장소
    url: "https://github.com/wwoosshh/clearly-web"
    kind: repo
  - label: barun-order.com (서버 중지)
    url: "https://barun-order.com"
    kind: site
aiCollab: 서비스 흐름 설계, 데이터 모델, 성능·보안 문제의 판단과 검증은 직접 했습니다. 구현은 AI 코딩 에이전트와 함께 했고, 커밋 대부분에 공동 작성 표기가 있습니다.
tags: [backend, fullstack, product]
---

## 문제

이사청소 업체를 고를 때 소비자는 견적을 비교하기 어렵고, 업체가 믿을 만한지 판단할 정보도 부족합니다.

## 접근

- 견적 요청 → 업체 제안 → 비교 → 채팅 → 매칭으로 이어지는 흐름을 NestJS 모듈과 Prisma 모델로 만들었습니다.
- 웹(Next.js)과 모바일 앱(Expo)이 같은 API를 쓰도록 했고, 앱을 위해 헤더 토큰 인증과 푸시 알림(FCM)을 넣었습니다.
- 실시간 채팅은 Socket.IO로, 자주 읽는 데이터는 Redis 캐시로 처리했습니다.
- 소셜 로그인, 구독 요금제, 고객 관리, 관리자 화면까지 1인으로 만들었습니다.

## 결과

- 고객 관리 화면의 N+1 쿼리를 4N+3개에서 7개로 줄였습니다.
- OAuth 콜백에서 토큰이 URL로 노출되던 문제를 임시 코드 교환 방식으로 바꿨습니다. 리프레시 토큰은 해시로 저장하고, 인증은 httpOnly 쿠키로 옮겼습니다.
- Redis 캐시를 8개 서비스에 적용했습니다.
- barun-order.com 도메인으로 요금제·약관 페이지와 모바일 앱 빌드까지 준비했습니다.

## 주요 결정

- 견적 건별 포인트 과금 대신 구독 요금제를 택했습니다.

## 한계와 다음 단계

- 지금은 백엔드 서버가 중지되어 로그인과 견적이 동작하지 않습니다. 시연 영상으로 대체할 예정입니다.
- 자동 테스트가 부족해 CI가 실패한 채로 남아 있습니다. 서버를 다시 올릴 때 테스트부터 보강할 계획입니다.
- 실제 사용자는 없습니다.

## AI 협업 방식

서비스 흐름 설계, 데이터 모델, 성능·보안 문제의 판단과 검증은 직접 했습니다. 구현은 Claude Code와 함께 했습니다.
```

"견적 건별 포인트 과금 대신 구독 요금제"는 Step 1에서 다음 명령으로 확인한다. 근거가 없으면 이 bullet을 지운다.

```bash
gh api "repos/wwoosshh/clearly-backend/commits?per_page=100" --paginate --jq '.[].commit.message | split("\n")[0]' | grep -iE "구독|subscription|포인트"
```

- [ ] **Step 4: `mzcube.mdx` 작성**

Step 1에서 확인한 커밋 수를 `커밋 445개` 자리에 넣는다.

```mdx
---
title: 맛집큐브 — 맛집 지도·리뷰 서비스
tagline: 부천·인천·서울 맛집 지도와 리뷰 플랫폼. 자체 도메인, 약관, 검색 엔진 최적화까지 갖춰 런칭을 준비했습니다
tier: featured
track: product
order: 7
period:
  start: "2025-09"
  end: "2026-01"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [React, TypeScript, MUI, Express, Supabase, JWT, Cloudinary, Vercel, Render]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/foodiemap-website"
deployment:
  state: down
  url: "https://www.mzcube.com"
asOf: 2026-09-29
brief:
  problem: 동네 맛집 정보를 지역 단위로 모아 지도와 리뷰로 볼 수 있는 곳이 필요했습니다.
  approach: React 프론트엔드와 Express·Supabase 백엔드를 만들고, 초기 로딩의 요청 폭증을 화면 단위 통합 API와 서버의 병렬 쿼리로 해결했습니다.
  result: 자체 도메인 mzcube.com, 약관·개인정보처리방침, 검색 엔진 최적화, 4개 국어까지 갖춰 런칭을 준비했습니다. 현재 백엔드 서버는 중지 상태입니다.
metrics:
  - label: 프로덕션 배포
    value: 302회
    evidence: "https://github.com/wwoosshh/foodiemap-website/deployments"
links:
  - label: 웹 저장소
    url: "https://github.com/wwoosshh/foodiemap-website"
    kind: repo
  - label: mzcube.com (서버 중지)
    url: "https://www.mzcube.com"
    kind: site
aiCollab: 기능 기획, 데이터 설계, 성능·보안 판단은 직접 했습니다. 2025년 9월 AI 코딩 에이전트를 도입한 뒤로는 구현을 AI와 함께 했고, 그 이후 커밋 대부분에 공동 작성 표기가 있습니다.
tags: [fullstack, product, performance]
---

## 문제

부천·인천·서울 지역 맛집 정보를 한곳에서 지도와 리뷰로 볼 수 있는 서비스를 만들고 싶었습니다.

## 접근

- React·TypeScript 프론트엔드와 Express·Supabase 백엔드를 1인으로 만들었습니다.
- 초기 로딩 때 요청이 폭증하던 문제를 화면 단위 통합 API로 해결했습니다. 서버에서 7개 쿼리를 병렬로 처리합니다.
- 로그인·가입 같은 엔드포인트마다 요청 제한을 두고, 보안 헤더와 CORS 허용 목록을 적용했습니다.
- 한글 초성 검색과 자동완성, 소셜 로그인, 4개 국어를 지원했습니다.

## 결과

- 자체 도메인 mzcube.com에 약관·개인정보처리방침과 검색 엔진 최적화(사이트맵, 구조화 데이터)까지 갖춰 런칭을 준비했습니다.
- 약 4개월 동안 커밋 445개, 프로덕션 배포 302회를 했습니다.
- 데이터베이스를 MongoDB에서 Supabase로 옮겼습니다.

## 주요 결정

- 탈퇴 요청은 30일 유예 뒤 예약 작업으로 자동 파기하도록 했습니다.

## 한계와 다음 단계

- 지금은 백엔드 서버가 정지되어 데이터가 표시되지 않습니다. 시연 영상으로 대체할 예정입니다.
- 자동 테스트와 CI가 없습니다.
- 실제 사용자는 없습니다.

## AI 협업 방식

기능 기획, 데이터 설계, 성능·보안 판단은 직접 했습니다. 2025년 9월부터 Claude Code를 도입해 구현을 함께 했습니다.
```

- [ ] **Step 5: `nogada-rpg.mdx` 작성**

Step 1의 값으로 수치를 맞춘다.

```mdx
---
title: nogada RPG — 서버 권위형 생활기술 RPG
tagline: 게임 규칙을 서버가 판정하는 웹 RPG 모노레포와, 미니PC에 직접 구축한 CI/CD
tier: featured
track: product
order: 8
period:
  start: "2026-08"
  end: "2026-08"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [TypeScript, Phaser, React, Fastify, PostgreSQL 17, Docker, Caddy, Capacitor, GitHub Actions]
repo:
  visibility: private
deployment:
  state: none
asOf: 2026-09-29
brief:
  problem: 웹 게임에서 클라이언트가 결과를 계산하면 조작에 취약하고, 클라이언트와 서버의 계산이 조금씩 어긋납니다.
  approach: 게임 공식을 공유 패키지 하나에 두고 서버가 모든 결과를 판정하게 했으며, 같은 캐릭터에 동시에 들어온 요청은 버전 비교와 재시도로 막았습니다.
  result: 코드 약 36.5K줄에 테스트 약 36.7K줄을 갖췄고, 실제 PostgreSQL로 CI를 돌린 뒤 미니PC의 자가 호스팅 러너로 배포합니다.
metrics:
  - label: 코드 / 테스트 규모
    value: 약 36.5K줄 / 36.7K줄 (테스트 파일 125개)
    evidence:
      private: true
      note: 면접에서 화면 공유로 시연
  - label: CI (실제 PostgreSQL 17 테스트 + 자가 호스팅 배포)
    value: 27회 중 26회 성공
    evidence:
      private: true
      note: 면접에서 화면 공유로 시연
  - label: 동시 갱신 유실 방지
    value: 버전 비교 + 최대 3회 재시도
    evidence:
      private: true
      note: 면접에서 화면 공유로 시연
aiCollab: 서버 판정 구조, 동시성 설계, 배포 파이프라인 구성은 직접 했습니다. 구현은 AI 코딩 에이전트와 함께 했고, 커밋 대부분에 공동 작성 표기가 있습니다.
tags: [backend, game, concurrency, infra]
---

## 문제

웹 게임에서 클라이언트가 결과를 계산하면 조작에 취약하고, 클라이언트와 서버의 계산이 조금씩 어긋납니다.

## 접근

- 게임 공식을 공유 패키지 하나에 두어, 클라이언트가 보여 주는 숫자와 서버가 판정하는 숫자가 항상 같게 했습니다.
- 모든 결과는 서버가 판정합니다. 같은 캐릭터에 요청이 동시에 들어오면, 읽은 버전이 바뀌지 않았을 때만 저장하고 최대 3번 다시 시도해 갱신 유실을 막았습니다.
- CI에서 실제 PostgreSQL 17로 테스트를 돌리고, 미니PC의 자가 호스팅 러너로 배포합니다(Docker Compose, Caddy).
- 클라이언트는 Phaser와 React로 만들고, Capacitor로 앱 포장까지 했습니다.

## 결과

- 코드 약 36.5K줄에 테스트 약 36.7K줄(테스트 파일 125개)을 갖췄습니다.
- CI 27회 중 26회가 성공했습니다(미니PC 배포 포함).

## 주요 결정

- 저장소는 비공개로 둡니다. 재배포가 금지된 유료 그래픽 에셋을 쓰고 있기 때문입니다. 코드는 면접에서 화면 공유로 보여 드릴 수 있습니다.

## 한계와 다음 단계

- 공개 서비스로 배포하지 않았습니다.

## AI 협업 방식

서버 판정 구조, 동시성 설계, 배포 파이프라인 구성은 직접 했습니다. 구현은 Claude Code와 함께 했습니다.
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/content/projects
git commit -m "content: 에이전트·제품 대표작 4개(asahi·바른오더·맛집큐브·nogada)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: 콘텐츠 — 카드·한 줄 프로젝트, 전체 기술 스택, 콘텐츠 완성도 검사

**Files:**
- Create: `src/content/projects/geulos.mdx`, `connect.mdx`, `monney.mdx`, `semicollon-homepage.mdx`, `gitspace.mdx`, `novel-worker.mdx`, `battle-arena.mdx`, `tests/e2e/content.spec.ts`
- Modify: `src/data/profile.ts`(skills 전체)

**Interfaces:**
- Consumes: 스키마, id 표
- Produces:
  - card: `geulos`, `connect`, `monney`
  - line: `semicollon-homepage`, `gitspace`, `novel-worker`, `battle-arena`
  - 최종 skills
  - 콘텐츠 완성도 E2E

- [ ] **Step 1: 실패하는 완성도 테스트 작성**

`tests/e2e/content.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const ids = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('data-project')));

test('콘텐츠 완성도: 섹션별 프로젝트가 정해진 순서로 모두 있다', async ({ page }) => {
  await page.goto('/');
  expect(await ids(page, '#ml [data-project]')).toEqual(['entail', 'torch-compile-fuzzer', 'geul-lang', 'inversa-bench']);
  expect(await ids(page, '#agent-product [data-project]')).toEqual(['asahi', 'barun-order', 'mzcube', 'nogada-rpg']);
  expect(await ids(page, '#more [data-project]')).toEqual([
    'geulos',
    'connect',
    'monney',
    'semicollon-homepage',
    'gitspace',
    'novel-worker',
    'battle-arena',
  ]);
});

test('콘텐츠 완성도: 기술 스택의 모든 항목이 프로젝트로 연결된다', async ({ page }) => {
  await page.goto('/');
  const skills = page.locator('#skills .skill');
  const count = await skills.count();
  expect(count).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < count; i++) {
    expect(await skills.nth(i).locator('.skill__projects a').count()).toBeGreaterThan(0);
  }
});

test('콘텐츠 완성도: 서버가 꺼진 서비스는 운영 중으로 표시되지 않는다', async ({ page }) => {
  await page.goto('/');
  for (const id of ['barun-order', 'mzcube']) {
    const card = page.locator(`[data-project="${id}"]`);
    await expect(card).toContainText('서버 중지');
    await expect(card).not.toContainText('운영 중');
  }
});
```

Run: `npm run test:e2e -- tests/e2e/content.spec.ts`
Expected: FAIL. `#more`가 비어 있고, 기술 항목 수가 부족하다.

- [ ] **Step 2: 원본 확인**

Run:

```bash
gh api repos/wwoosshh/geul_OS/contents/docs/adr/041-ai-chat-efficiency.md --jq .content | base64 -d | grep -nE "40|27|%" | head -10
gh api repos/wwoosshh/Nunconnect/readme --jq .content | base64 -d | sed -n '4,5p;27,30p'
gh api repos/wwoosshh/monney/contents/src/vstock/exchange/fill.py --jq .content | base64 -d | head -30
curl -s -o /dev/null -w "semicollon.com %{http_code}\n" -L --max-time 15 https://semicollon.com
curl -s -o /dev/null -w "novelworker.work %{http_code}\n" -L --max-time 15 https://novelworker.work
for r in geul_OS Nunconnect monney GitSpace novel-worker-frontend BattleArena; do printf "%s " $r; gh api repos/wwoosshh/$r --jq '.visibility'; done
```

Expected:
- ADR-041에 도구 호출 −40%와 응답 지연 −27%(32.2→23.6초)가 있다.
- Nunconnect README 4~5행에 1인 개발과 생성형 AI 도움이, 27~30행에 1.1.0 SignalR 전환이 있다.
- `fill.py`는 다음 틱 체결과 슬리피지를 다룬다.
- semicollon.com은 200이다.
- 리포 6개가 모두 public이다.

값이 다르면 아래 파일에서 해당 수치를 고치거나 지운다.

- [ ] **Step 3: 카드 3개 작성**

`src/content/projects/geulos.mdx`:

```mdx
---
title: GeulOS
tagline: Linux VM 위에서 도는 AI-네이티브 OS 런타임 참조 구현. 화면의 모든 요소가 객체이고, 사용자 클릭과 AI 호출이 같은 경로를 지납니다
tier: card
track: other
order: 20
period:
  start: "2026-05"
  end: "2026-06"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Rust, tokio, QEMU, Alpine Linux, Claude API]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/geul_OS"
deployment:
  state: none
asOf: 2026-09-29
metrics:
  - label: AI 대화 효율 개선 (ADR-041)
    value: 도구 호출 −40% · 응답 지연 −27%
    evidence: "https://github.com/wwoosshh/geul_OS/blob/main/docs/adr/041-ai-chat-efficiency.md"
aiCollab: 아키텍처 결정(ADR)과 검증은 직접 했고, 구현은 AI 코딩 에이전트와 함께 했습니다.
tags: [os, rust, agent]
---
```

`src/content/projects/connect.mdx`:

```mdx
---
title: Connect 메신저
tagline: 1인 개발로 운영한 Windows 실시간 채팅 앱. SignalR 서버, 설치 파일 배포, 자동 업데이트, AI 캐릭터 채팅까지 만들고 v1.7.2까지 운영한 뒤 종료했습니다
tier: card
track: other
order: 21
period:
  start: "2025-04"
  end: "2025-09"
role: 1인 개발 · 생성형 AI 도움
stack: [C#, .NET 8, WPF, SignalR, ASP.NET Core]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/Nunconnect"
deployment:
  state: none
asOf: 2026-09-29
metrics:
  - label: 채팅 전송 방식 전환 (v1.1.0)
    value: 주기적 요청 → SignalR
    evidence: "https://github.com/wwoosshh/Nunconnect/blob/master/README.md?plain=1#L27-L30"
aiCollab: README에 생성형 AI의 도움을 받았다고 밝혔습니다. 설계와 운영, 기술 부채 분석은 직접 했습니다.
tags: [desktop, realtime, csharp]
---
```

`src/content/projects/monney.mdx`:

```mdx
---
title: monney
tagline: 실제 시세에 동기화된 가상 거래소. AI 트레이더와 사람을 같은 조건에서 비교하려는 실험 환경입니다 (진행 중)
tier: card
track: other
order: 22
period:
  start: "2026-09"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Python, FastAPI, SQLite, pytest]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/monney"
deployment:
  state: none
asOf: 2026-09-29
metrics:
  - label: 미래 참조 편향 차단
    value: 다음 틱 체결 + 슬리피지
    evidence: "https://github.com/wwoosshh/monney/blob/main/src/vstock/exchange/fill.py"
aiCollab: 거래 규칙과 실험 설계는 직접 했고, 구현은 AI 코딩 에이전트와 함께 했습니다.
tags: [fintech, simulation, agent]
---
```

- [ ] **Step 4: 한 줄 항목 4개 작성**

`src/content/projects/semicollon-homepage.mdx`:

```mdx
---
title: semicollon.com — 동아리 홈페이지
tagline: 코딩 동아리 세미콜론의 공식 사이트. 부원들이 PR로 참여하도록 CI와 리뷰 흐름을 만들었습니다
tier: line
track: other
order: 30
period:
  start: "2026-09"
role: 개발·운영 · AI 코딩 에이전트 협업
stack: [React, Vite, Express]
repo:
  visibility: public
  url: "https://github.com/semicollon-club/homepage"
deployment:
  state: live
  url: "https://semicollon.com"
asOf: 2026-09-29
aiCollab: AI 코딩 에이전트와 함께 만들었습니다.
---
```

`src/content/projects/gitspace.mdx`:

```mdx
---
title: GitSpace
tagline: git 커밋 이력을 3D 우주로 보여 주는 데스크톱 뷰어
tier: line
track: other
order: 31
period:
  start: "2026-07"
  end: "2026-07"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Rust, Tauri, three.js]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/GitSpace"
deployment:
  state: none
asOf: 2026-09-29
aiCollab: AI 코딩 에이전트와 함께 만들었습니다.
---
```

`src/content/projects/novel-worker.mdx`:

```mdx
---
title: NovelWorker
tagline: 웹소설 작가용 집필·연재 플랫폼(매크로, 설정 DB, 예약 연재)
tier: line
track: other
order: 32
period:
  start: "2026-03"
  end: "2026-03"
role: 1인 개발 · AI 코딩 에이전트 협업
stack: [Next.js, Tiptap, Express, Supabase]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/novel-worker-frontend"
deployment:
  state: down
  url: "https://novelworker.work"
asOf: 2026-09-29
aiCollab: AI 코딩 에이전트와 함께 만들었습니다.
---
```

`src/content/projects/battle-arena.mdx`:

```mdx
---
title: BattleArena
tagline: Unity Netcode와 Relay·Lobby로 만든 4인 협동 슈터 프로토타입
tier: line
track: other
order: 33
period:
  start: "2025-06"
  end: "2025-06"
role: 1인 개발
stack: [Unity 6, Netcode for GameObjects, Unity Gaming Services]
repo:
  visibility: public
  url: "https://github.com/wwoosshh/BattleArena"
deployment:
  state: none
asOf: 2026-09-29
aiCollab: 커밋에 AI 공동 작성 표기가 없습니다.
---
```

- [ ] **Step 5: 전체 기술 스택으로 교체**

`src/data/profile.ts`의 `skills`를 다음으로 바꾼다.

```ts
  skills: [
    {
      group: 'AI/ML 시스템',
      items: [
        { name: 'PyTorch · torch.compile', projects: ['torch-compile-fuzzer'] },
        { name: 'vLLM · SGLang · transformers', projects: ['entail'] },
        { name: 'Triton', projects: ['entail', 'torch-compile-fuzzer'] },
        { name: 'LLM 평가 설계 (sympy 검증, 통계)', projects: ['inversa-bench'] },
      ],
    },
    {
      group: '언어 · 컴파일러 · 시스템',
      items: [
        { name: 'Python', projects: ['entail', 'torch-compile-fuzzer', 'inversa-bench', 'geul-lang'] },
        { name: 'x86-64 코드 생성 · PE 실행 파일', projects: ['geul-lang'] },
        { name: 'Rust', projects: ['geulos', 'gitspace'] },
      ],
    },
    {
      group: 'AI 에이전트',
      items: [{ name: 'Claude Agent SDK · MCP', projects: ['asahi'] }],
    },
    {
      group: '웹 · 백엔드',
      items: [
        { name: 'TypeScript · Node.js', projects: ['asahi', 'barun-order', 'nogada-rpg'] },
        { name: 'NestJS · Next.js · React', projects: ['barun-order', 'mzcube'] },
        { name: 'PostgreSQL · Redis', projects: ['barun-order', 'nogada-rpg'] },
        { name: 'C# · .NET (WPF, SignalR)', projects: ['connect'] },
      ],
    },
    {
      group: '인프라 · 도구',
      items: [
        { name: 'GitHub Actions · Docker · 자가 호스팅 배포', projects: ['nogada-rpg', 'geul-lang'] },
        { name: 'Vercel · Railway · Supabase', projects: ['barun-order', 'mzcube'] },
      ],
    },
  ],
```

- [ ] **Step 6: 통과 확인과 PDF 장수 확인**

Run: `npx vitest run && npm run test:e2e && npm run pdf`
Expected:
- 전체 PASS(content 3개 포함).
- `npm run pdf`가 4장 이하로 저장된다.

4장을 넘으면 `Print.astro`의 `body.print` 글자 크기를 `12px`에서 `11.5px`로 줄이고 다시 실행한다. 그래도 넘치면 `ProjectBrief`의 `quarter` 수치를 1개로 줄인다(`size === 'half' ? 3 : 1`). 가장 긴 `brief` 문장을 줄이는 것은 Task 16 검토 때 사용자에게 제안한다.

- [ ] **Step 7: 커밋**

```bash
git add src/content/projects src/data/profile.ts tests/e2e/content.spec.ts public/portfolio.pdf src/layouts/Print.astro src/components/ProjectBrief.astro
git commit -m "content: 카드·한 줄 프로젝트와 전체 기술 스택, 완성도 검사" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: 사용자 콘텐츠 검토와 PDF 생성 (컨트롤러가 직접 진행)

이 작업은 사용자와 대화하며 진행하므로 서브에이전트에게 맡기지 않는다.

**Files:**
- Modify: 사용자가 고치라고 한 콘텐츠·데이터 파일, `public/portfolio.pdf`
- Create (저장소 밖): `C:\Portpolio\private\contact.json`, `C:\Portpolio\private\우성현_포트폴리오_제출용.pdf`

**Interfaces:**
- Consumes: 완성된 사이트 (Task 15)
- Produces: 사용자가 승인한 문구, 공개용 PDF(커밋), 제출용 PDF(저장소 밖)

- [ ] **Step 1: 로컬 미리보기를 띄워 사용자에게 보여 준다**

Run: `npm run build && npm run preview`
브라우저에서 `http://localhost:4321/`, 상세 페이지 8개, `/print/`를 연다.

- [ ] **Step 2: 검토 목록을 사용자에게 제시하고 답을 받는다**

1. 대표 분야 문구("정확성을 검증하는 AI/ML 시스템 엔지니어")와 소개 2문장
2. 동아리 활동 시작 시기(현재 2026-06으로 적음. GitHub 조직은 2026-08 생성)
3. 이루리랩스 설명 bullet 4개가 회사에 공개해도 되는 범위인지
4. 각 대표작의 "한계와 다음 단계" 문구 수위(특히 CI 실패, 서버 중지)
5. AI 협업 문구
6. "그 밖의 프로젝트" 한 줄 목록 4개를 바꾸거나 더할지(최대 6개)
7. 링크하는 리포 중 비공개 조사 자료의 보안 조치 목록에 있는 항목. 컨트롤러는 `C:\Portpolio\research\00-overview.md` 7장과 링크 목록을 대조한 결과를 말로만 알린다(저장소에 적지 않는다). 사용자가 먼저 고칠지, 링크를 뺄지, 그대로 둘지 결정한다.

- [ ] **Step 3: 답에 따라 파일을 고치고 전체 테스트를 통과시킨다**

Run: `npx vitest run && npm run test:e2e`
Expected: 전체 PASS.

- [ ] **Step 4: 전화번호 파일을 저장소 밖에 만든다**

컨트롤러가 대화에서 받은 번호로 `C:\Portpolio\private\contact.json`을 만든다. 형식은 `{"phone": "010-0000-0000"}`이다. 이 파일은 `site/` 밖에 있어 커밋될 수 없다.

- [ ] **Step 5: PDF 두 개를 만든다**

Run: `npm run pdf && npm run pdf:private`
Expected:
- `public/portfolio.pdf`와 `C:\Portpolio\private\우성현_포트폴리오_제출용.pdf`가 저장되고, 둘 다 4장 이하다.
- 두 PDF를 열어 한글 글꼴, 링크, 잘림을 눈으로 확인한다.
- 공개용에 전화번호가 없고, 제출용에만 있는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src public/portfolio.pdf
git commit -m "content: 사용자 검토 반영과 공개용 PDF 갱신" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: README, 최종 확인, 푸시, 배포 안내 (컨트롤러가 직접 진행)

**Files:**
- Create: `README.md`
- Modify (배포 후): `astro.config.mjs`(`site`), `src/data/profile.ts`(`contact.site`), `public/portfolio.pdf`

**Interfaces:**
- Consumes: 완성된 사이트
- Produces: 원격 `main`, 통과한 CI, Vercel 설정 안내, 배포 주소가 들어간 PDF

- [ ] **Step 1: README 작성**

`README.md`:

````markdown
# 우성현 포트폴리오

"정확성을 검증하는 AI/ML 시스템 엔지니어" 포트폴리오 사이트와 PDF의 소스입니다. Astro 7 정적 사이트이고, 이 사이트도 AI 코딩 에이전트(Claude Code)와 함께 만들었습니다.

## 명령어

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 (http://localhost:4321) |
| `npm run build` | 타입 검사 + 정적 빌드 (`dist/`) |
| `npm test` | 단위·컴포넌트·디자인 규칙 테스트 (Vitest) |
| `npm run test:e2e` | 빌드 후 E2E 테스트 (Playwright) |
| `npm run pdf` | 공개용 PDF → `public/portfolio.pdf` |
| `npm run pdf:private` | 제출용 PDF(전화번호 포함) → 저장소 밖 `../private/` |
| `npm run check:links` | 빌드 결과의 외부 링크 검사 |

처음 한 번은 `npx playwright install chromium`이 필요합니다.

## 콘텐츠 수정

- 프로젝트: `src/content/projects/<id>.mdx`. 앞부분 데이터 형식은 `src/lib/schema.ts`를 따릅니다.
- 프로필·경력·기술 스택: `src/data/profile.ts`
- 외부 PR·이슈: `src/data/contributions.ts`
- 모든 수치에는 근거 URL이 필요합니다. 없으면 빌드가 실패합니다. 비공개 저장소 프로젝트만 `{ private: true, note }`를 쓸 수 있습니다.
- 서버가 꺼진 서비스는 `deployment.state: down`으로 둡니다. 시연 영상이 생기면 `video`에 URL을 넣습니다.
- 수치를 고치면 `asOf` 날짜도 고칩니다.

## 디자인 규칙

- 그림자, transform, 전환 효과, 애니메이션을 쓰지 않습니다. 구분은 1px 선과 배경색으로만 합니다.
- 색은 `src/styles/tokens.css`에서만 정의합니다.
- 모서리는 `var(--r-sm)`, `var(--r-md)`만 씁니다.
- 위 규칙은 `src/lib/style-rules.test.ts`와 `tests/e2e/design.spec.ts`가 검사합니다.

## 배포 (Vercel)

GitHub 저장소를 Vercel에 가져오면 Astro가 자동으로 인식됩니다. Build Command는 `npm run build`, Output Directory는 `dist`, Node.js는 22.x입니다. `main`에 푸시하면 자동으로 배포됩니다.

## 설계 문서

- 설계: `docs/superpowers/specs/2026-09-29-portfolio-design.md`
- 구현 계획: `docs/superpowers/plans/2026-09-29-portfolio-site.md`
````

- [ ] **Step 2: 최종 확인**

Run: `npm ci && npm test && npm run build && npx playwright test && npm run check:links`
Expected: 모두 성공한다. 깨진 외부 링크가 있으면 콘텐츠를 고치고 다시 실행한다.

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs: README(명령어·콘텐츠 수정·디자인 규칙·배포)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: 사용자 확인 후 푸시하고 CI 확인**

사용자에게 푸시할 커밋 목록(`git log --oneline origin/main..main`)을 보여 주고 승인을 받는다.

Run:

```bash
git push origin main
RUN_ID=$(gh run list -R wwoosshh/portfolio --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" -R wwoosshh/portfolio --exit-status
```

Expected: CI가 성공한다. 실패하면 로그(`gh run view "$RUN_ID" -R wwoosshh/portfolio --log-failed`)를 확인해 고친다.

- [ ] **Step 5: Vercel 연결 안내**

사용자에게 다음을 안내한다.
- Vercel에서 **Add New → Project → Import** `wwoosshh/portfolio`
- Framework Preset: Astro(자동), Build Command: `npm run build`, Output: `dist`, Node.js 22.x
- 사용자가 요청하면 컨트롤러가 Vercel 도구로 연결을 돕는다. 이 경우 각 단계마다 확인을 받는다.

- [ ] **Step 6: 배포 주소 반영**

사용자가 배포 주소(예: `https://<이름>.vercel.app`)를 알려 주면 다음을 반영한다.
- `astro.config.mjs`의 `defineConfig`에 `site: '<주소>'`를 추가한다.
- `src/data/profile.ts`의 `contact`에 `site: '<주소>'`를 추가한다.

Run: `npx vitest run && npm run test:e2e && npm run pdf && npm run pdf:private`
Expected: 전체 PASS. 두 PDF의 연락처 줄에 사이트 주소가 들어간다.

```bash
git add astro.config.mjs src/data/profile.ts public/portfolio.pdf
git commit -m "chore: 배포 주소를 사이트 설정과 PDF에 반영" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

## 부록: 구현 중 바뀐 판단

사이트의 실제 내용은 `src/`가 기준이며, 구현하는 동안 이 계획에서 바뀐 판단은 다음과 같다.

- 스키마의 모든 객체를 strict로 검사하고, URL은 http(s)만 허용했다.
- 줄 번호가 붙은 GitHub 근거 링크는 커밋 SHA로 고정하고 테스트로 강제했다.
- "모든 수치"라는 표현 대신 "프로젝트 핵심 수치"를 쓴다(근거가 강제되는 범위).
- 서버가 꺼진 서비스에 시연 영상이 있으면 상세 페이지에 링크한다.
- 새 탭으로 여는 링크는 rel 속성과 ↗ 표시를 함께 단다.
- 작은 라벨과 값의 기준선을 맞추고, 좁은 화면에서는 핵심 수치 값을 라벨 아래로 내린다.
- 인쇄용 PDF는 한글을 텍스트로 추출할 수 있도록 고정 굵기 Pretendard를 쓰고, A4 4장에 맞추려 글자 크기·여백·요약 수치 개수를 조정했다.
- 카드에 대표 수치를 함께 보이고, 한 줄 목록과 인쇄용 목록에도 역할(AI 협업 여부 포함)을 표기한다.
- 콘텐츠는 원본 자료와 대조해, 다른 값은 원본 값으로 고치고 확인할 수 없는 문장은 지웠다. 예를 들어:
  - PyTorch 이슈는 "PyTorch 측에서 분류"로 적는다.
  - 퍼저 제목은 "수정 PR"로 적는다.
  - asahi PR 수는 main 브랜치 기준으로 센다.
  - 시연 영상·재가동 계획 문장은 뺐다.
  - 역할 문구는 "방향과 판단은 직접, 구현과 문서 작업은 AI와 함께"로 통일했다.
- 사용자 결정으로 일부 저장소는 사이트에서 링크하지 않는다.
