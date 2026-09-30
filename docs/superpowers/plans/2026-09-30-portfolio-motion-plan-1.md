# 포트폴리오 v2 · 계획 1: 기반과 홈 스토리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v1 사이트를 종이·도면 디자인과 GSAP 스크롤 연출을 갖춘 "발표형" 홈으로 바꾼다. 히어로(오라클 장면), 핵심 성과, 장 간지, 1장 대표작 장면, 2장 가로 구간(움직이는 도면 4개), 경력, 일하는 방식, 그 밖의 프로젝트·기술 스택, 마무리까지를 이 계획에서 만든다. 배포 주소도 반영한다.

**Architecture:** Astro가 모든 장면을 최종 상태의 HTML로 미리 그리고, `src/motion/`의 GSAP 코드가 그 위에 연출을 얹는다(점진적 향상). 장면은 `data-scene` 표시가 붙은 요소와 `src/motion/scenes/<name>.ts`의 설정 함수 한 쌍이다. `gsap.matchMedia()`가 데스크톱(full)·모바일(lite)·움직임 줄임(static) 세 갈래로 나눈다.

**Tech Stack:** Astro 7.3.5, TypeScript 6, GSAP 3.15.0(ScrollTrigger·SplitText·DrawSVGPlugin·CustomEase), Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-30-portfolio-motion-design.md`

이 계획은 v2 설계를 세 계획으로 나눈 것 중 첫째다. 계획 2는 대표작 시연 4개(데이터 추출, 상태 머신, 1장 장면에 넣기), 계획 3은 상세 페이지 재스타일과 최종 점검이다. 이 계획이 끝나면 사이트는 배포할 수 있는 상태다. 1장의 대표작 4개는 이 계획에서 "수치 패널 장면"으로 두고, 계획 2에서 시연으로 바꾼다.

**설계와 다른 점(이 계획의 결정):**
- 장면 연출은 페이지 로드 때 문서 순서대로 한 번에 등록한다. 고정(pin) 구간의 간격을 ScrollTrigger가 올바르게 계산하려면 모든 트리거가 처음부터 있어야 하기 때문이다. 설계 §5.2의 "화면 근처에서 불러오기"는 계획 2의 무거운 시연 코드에만 적용한다.
- 히어로의 "불일치 줄에 마우스를 올리면 이슈 요약" 대신 요약을 캡션으로 항상 보여 준다. 키보드·터치·움직임 줄임 사용자에게도 같은 정보가 가도록 하기 위해서다.
- 핵심 성과의 큰 숫자를 위해 `highlights[].figure`(값과 단위) 필드를 추가한다. 숫자는 이미 라벨·설명에 있는 사실만 쓴다.
- 장 간지와 경력 타임라인은 고정 없이 스크롤에 맞춰 스크럽한다. 설계 §4.4는 스크럽을 고정 장면에만 쓰게 했지만, §3의 분량표에서 이 둘은 고정 장면이 아니므로 스크럽을 위해 고정을 더하지 않는다(최종 검토에서 수용).
- 장 제목 크기 `--fs-chapter`는 `clamp(2rem, 5vw, 4.5rem)`으로 설계 §4.2의 `clamp(40px, 6vw, 88px)`보다 작다. 히어로 제목(`--fs-hero`)은 설계 그대로다(최종 검토에서 수용).
- 1장 대표작의 수치 패널은 full에서 오른쪽 40px 떨어진 자리에서 들어온다. 설계는 이동 거리를 정하지 않았다. 폭 768~1231px에서 가로 스크롤이 생기지 않도록 `#ml`을 `overflow-x: clip`으로 자른다(최종 검토에서 수용).

## Global Constraints

- 모든 색은 `src/styles/tokens.css`에서만 정의한다. 값: 종이 `#FBFBF8`, 잉크 `#111111`, 도면 파랑(선) `#2F6FED`, 링크 글씨 `#2563EB`, 형광 노랑 `#FFE066`, 빨강 선·면 `#E5484D`/글씨 `#C4323A`, 초록 선·면 `#18A058`/글씨 `#127A43`, 모눈 패널 바탕 `#F6F7F9`·격자선 `#E2E7EE`. 글씨 색은 바탕·표면·패널 모두에서 대비 4.5:1 이상.
- 그림자 금지. 모서리는 `var(--r-sm)` 6px, `var(--r-md)` 10px, `50%`만. 그라데이션은 `global.css`(형광펜·모눈 패널)에서만.
- 움직임 토큰: `--dur-fast` 200ms, `--dur-base` 400ms, `--dur-slow` 800ms, `--ease-out` `cubic-bezier(0.2, 0.8, 0.2, 1)`, `--ease-in-out` `cubic-bezier(0.7, 0, 0.3, 1)`, `--ease-back` `cubic-bezier(0.34, 1.56, 0.64, 1)`. CSS의 `transition`·`animation`은 이 토큰만 쓴다. `src/motion/tokens.ts`는 같은 값을 갖는다.
- 기본 움직임은 등장·선 그리기·숫자 변화·형광펜·상태 색 전환뿐이다. 큰 동작(3D 전환, 튕김, 흔들림, 기울며 넘어가는 슬라이드, 카드 기울기)은 설계 §4.4의 지정 위치에서만 쓴다. 움직이는 속성은 transform·투명도·SVG 선 그리기뿐이다.
- 세 가지 경우를 모두 지원한다. `full`은 폭 768px 이상이면서 움직임을 허용한 경우로 고정과 스크럽을 쓴다. `lite`는 폭 768px 미만이면서 움직임을 허용한 경우로 고정 없이 등장만 쓴다. `static`은 `prefers-reduced-motion: reduce`인 경우로 최종 상태를 바로 보여 준다. 자바스크립트가 없으면 모든 내용이 보인다.
- GSAP은 `gsap@3.15.0`으로 정확히 고정하고, 플러그인 등록은 `src/motion/gsap.ts` 한 곳에서만 한다.
- 성능 예산: 홈의 자바스크립트 합계(gzip)는 100KB 이하, 스크롤 중 CLS는 0.05 미만이다.
- 연출과 데이터에 쓰는 값은 모두 실제 값이다. 새 데이터 파일은 출처(`sources[]`의 url·필요시 sha·lines, `extractedBy`, `verifiedAt`)를 가지며 스키마가 검사한다. 원본에 없는 값은 쓰지 않는다.
- v1 규칙 유지:
  - 프로젝트 핵심 수치와 홈 핵심 성과에는 근거가 있다.
  - 줄 번호 링크는 40자리 커밋 SHA로 고정한다(`src/lib/permalinks.test.ts`).
  - 문구는 "모든 수치" 대신 "프로젝트 핵심 수치"를 쓴다.
  - 새 탭 링크는 `rel="noopener noreferrer"`와 `↗`를 모두 갖는다.
  - 여러 줄에 걸친 요소와 식 사이에 보여야 하는 공백은 `{' '}`로 쓴다(Astro는 줄바꿈이 섞인 공백을 지운다).
  - 전화번호와 개인 이메일은 저장소·빌드·공개 PDF에 넣지 않는다. `010-0000-0000` 형식 예시는 된다.
  - `foodiemap-backend` 저장소는 사이트에서 링크하지 않는다.
- 인쇄 페이지(`/print/`)와 PDF에는 움직임 스크립트를 싣지 않고, A4 4장 이하를 유지한다.
- 모든 커밋은 마지막 줄에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 둔다. 푸시는 하지 않는다.
- 배포 주소는 `https://portfolio-nu-taupe-66.vercel.app`이다.

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/styles/tokens.css` | 색·글꼴·간격·모서리·움직임 토큰(유일한 색 정의 장소) |
| `src/styles/global.css` | 기본 요소, `.container`, `.panel`(모눈), `.mark`, `.sr-only`, 등장 전 숨김, 움직임 줄임 전역 규칙 |
| `src/styles/diagram.css` | 도면 SVG 공통 스타일(`.dg-*`) |
| `src/lib/chapters.ts` | 상단 목차의 장 목록 |
| `src/lib/demo-schema.ts` | 출처(provenance) 스키마와 히어로 데이터 스키마 |
| `src/data/hero.ts` | 히어로 오라클 장면의 실제 데이터(#198094)와 출처 |
| `src/motion/tokens.ts` | 움직임 토큰(초 단위)과 곡선, CustomEase 이름 |
| `src/motion/mode.ts` | full·lite·static 판별과 미디어 쿼리 |
| `src/motion/count.ts` | 숫자 세어 올리기의 순수 파싱·서식 |
| `src/motion/gsap.ts` | GSAP과 플러그인 등록(유일한 등록 장소) |
| `src/motion/effects.ts` | 흔들림·숫자 세기 같은 공용 연출 |
| `src/motion/reveal.ts` | 기본 등장과 장면의 요소 점유(claim) |
| `src/motion/layout.ts` | 상단 바 높이 읽기 |
| `src/motion/registry.ts` | 장면 이름 → 설정 함수 등록부 |
| `src/motion/scenes/*.ts` | 장면별 연출(hero, highlights, chapter, project, deck, timeline, how, more) |
| `src/motion/topbar.ts` | 진행 막대와 현재 장 표시 |
| `src/motion/main.ts` | 시작점: matchMedia 분기, 장면 설정, 기본 등장, 준비 표시 |
| `src/components/TopBar.astro` | 상단 바(홈 링크, 장 목차, 진행 막대) |
| `src/components/scenes/*.astro` | 홈 장면 마크업(Hero, Highlights, ChapterCard, ProjectScene, BuildDeck, HowIWork, More, Skills, Closing) |
| `src/components/diagrams/*.astro` | 2장 도면 4개와 선택용 `Diagram.astro` |

---

### Task 1: 배포 주소 반영

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/data/profile.ts` (`contact`)
- Modify: `src/layouts/Base.astro` (`<head>`)
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `profile.contact.site === 'https://portfolio-nu-taupe-66.vercel.app'`
  - 모든 페이지 `<head>`의 `link[rel=canonical]`과 `meta[property="og:url"]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/e2e/smoke.spec.ts` 끝에 추가:

```ts
test('대표 주소(canonical)와 og:url은 배포 주소다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://portfolio-nu-taupe-66.vercel.app/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://portfolio-nu-taupe-66.vercel.app/');
  await page.goto('/projects/entail/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://portfolio-nu-taupe-66.vercel.app/projects/entail/',
  );
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.ts`
Expected: 새 테스트 FAIL(`link[rel="canonical"]` 없음).

- [ ] **Step 3: 구현**

`astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://portfolio-nu-taupe-66.vercel.app',
  integrations: [mdx()],
});
```

`src/data/profile.ts`의 `contact`:

```ts
  contact: {
    email: 'nunconnect1@gmail.com',
    github: 'https://github.com/wwoosshh',
    site: 'https://portfolio-nu-taupe-66.vercel.app',
  },
```

`src/layouts/Base.astro`:
- 프런트매터의 `const { title, description, noindex = false } = Astro.props;` 다음 줄에 `const canonical = Astro.site ? new URL(Astro.url.pathname, Astro.site).href : undefined;`를 추가한다.
- `<head>`의 `<meta property="og:type" content="website" />` 다음에 아래 두 줄을 넣는다.

```astro
    {canonical && <link rel="canonical" href={canonical} />}
    {canonical && <meta property="og:url" content={canonical} />}
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/print.spec.ts`
Expected: 모두 PASS. `print.spec.ts`의 각주 테스트는 이제 "웹 포트폴리오(portfolio-nu-taupe-66.vercel.app)에서 확인할 수 있습니다."를 기대하고 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add astro.config.mjs src/data/profile.ts src/layouts/Base.astro tests/e2e/smoke.spec.ts
git commit -m "feat: 배포 주소를 사이트 설정·연락처·대표 주소에 반영" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 디자인 토큰 개정과 디자인 규칙 테스트

**Files:**
- Modify: `src/styles/tokens.css` (전체 교체)
- Modify: `src/styles/global.css` (전체 교체)
- Modify: `src/lib/style-rules.test.ts` (전체 교체)
- Create: `src/lib/contrast.test.ts`
- Modify: `tests/e2e/design.spec.ts:7` (바탕색 기대값)

**Interfaces:**
- Consumes: 없음
- Produces:
  - CSS 토큰(이후 모든 작업이 사용):
    - 바탕: `--bg --surface --panel --grid`
    - 선: `--line --line-strong --line-hover`
    - 글씨: `--text --text-2 --text-3 --link`
    - 도면·상태: `--blue --ok --ok-line --ok-bg --bad --bad-line --bad-bg --wait --off --mark`
    - 글꼴 크기: `--fs-hero --fs-chapter --fs-figure` 및 기존 `--fs-*`
    - 크기: `--w-wide --topbar-h`
    - 움직임: `--dur-fast --dur-base --dur-slow --ease-out --ease-in-out --ease-back`
  - 클래스:
    - `.container--wide`
    - `.panel`(모눈 패널)
    - `.sr-only`
    - `.motion [data-reveal]`(등장 전 숨김)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/style-rules.test.ts`를 다음으로 교체:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const TOKENS = 'styles/tokens.css';
const GLOBAL = 'styles/global.css';

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
    expect(styleFiles.map(rel)).toContain(TOKENS);
  });

  test('그림자를 쓰지 않는다', () => {
    const offenders = styleFiles.filter((f) => /(box|text)-shadow\s*:(?!\s*none)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  test('색 값은 tokens.css에서만 정의한다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== TOKENS)
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(read(f).replace(/href="[^"]*"/g, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('그라데이션은 global.css(형광펜·모눈 패널)에서만 쓴다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== GLOBAL)
      .filter((f) => /(linear|radial|conic)-gradient\(/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('transition·animation은 움직임 토큰만 쓴다', () => {
    const bad = styleFiles
      .filter((f) => ![TOKENS, GLOBAL].includes(rel(f)))
      .flatMap((f) =>
        [...read(f).matchAll(/(?<![-\w])(transition|animation)(-duration|-timing-function|-delay)?\s*:\s*([^;]+);/g)]
          .map((m) => m[3].replace(/var\([^)]*\)/g, '').trim())
          .filter((v) => /\d(ms|s)\b|cubic-bezier|\b(ease|ease-in|ease-out|ease-in-out|linear)\b/.test(v))
          .map((v) => `${rel(f)}: ${v}`),
      );
    expect(bad).toEqual([]);
  });

  test('움직임 줄임 전역 규칙이 global.css에 있다', () => {
    const block = read(path.join(SRC, GLOBAL)).match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(block, '움직임 줄임 블록').not.toBeNull();
    expect(block?.[1]).toMatch(/animation-duration/);
    expect(block?.[1]).toMatch(/transition-duration/);
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

`src/lib/contrast.test.ts` 생성:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) throw new Error(`토큰 --${name}이 없거나 6자리 색이 아닙니다`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('색 대비(WCAG AA 4.5:1)', () => {
  for (const bg of ['bg', 'surface', 'panel']) {
    for (const fg of ['text', 'text-2', 'text-3', 'link', 'ok', 'bad', 'wait', 'off']) {
      test(`--${fg} 글씨 / --${bg} 바탕`, () => {
        expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/style-rules.test.ts src/lib/contrast.test.ts`
Expected:
- FAIL: "움직임 줄임 전역 규칙이 global.css에 있다"(블록 없음)
- FAIL: contrast의 `--panel`·`--blue` 관련 항목(토큰 없음)

- [ ] **Step 3: 토큰과 전역 스타일 구현**

`src/styles/tokens.css`를 다음으로 교체:

```css
:root {
  /* 바탕 — 종이와 모눈 패널 */
  --bg: #fbfbf8;
  --surface: #ffffff;
  --panel: #f6f7f9;
  --grid: #e2e7ee;

  /* 선 */
  --line: #e2e7ee;
  --line-strong: #cfd6df;
  --line-hover: #9aa4b2;

  /* 글씨(바탕·표면·패널 모두에서 대비 4.5:1 이상) */
  --text: #111111;
  --text-2: #4b5563;
  --text-3: #626a76;
  --link: #2563eb;

  /* 도면과 상태 */
  --blue: #2f6fed;
  --ok: #127a43;
  --ok-line: #18a058;
  --ok-bg: #effaf3;
  --bad: #c4323a;
  --bad-line: #e5484d;
  --bad-bg: #fff1f1;
  --wait: #b45309;
  --off: #626a76;
  --mark: #ffe066;

  --font-sans: 'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Pretendard Variable', Pretendard, ui-monospace, 'Cascadia Code', Consolas, monospace;

  --fs-hero: clamp(2.5rem, 6vw, 5.5rem);
  --fs-chapter: clamp(2rem, 5vw, 4.5rem);
  --fs-figure: clamp(2.25rem, 4vw, 3.5rem);
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
  --w-wide: 1200px;
  --w-text: 680px;
  --topbar-h: 57px;

  /* 움직임 — src/motion/tokens.ts와 같은 값 */
  --dur-fast: 200ms;
  --dur-base: 400ms;
  --dur-slow: 800ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.7, 0, 0.3, 1);
  --ease-back: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

`src/styles/global.css`를 다음으로 교체:

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

.container--wide {
  max-width: var(--w-wide);
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

/* 모눈 패널: 다이어그램·시연 장면에만 쓴다 */
.panel {
  background-color: var(--panel);
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 20px 20px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
}

/* 형광펜: background-size를 움직여 긋는다 */
.mark {
  background: linear-gradient(transparent 60%, var(--mark) 60%) no-repeat;
  background-size: 100% 100%;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.sr-only {
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

/* 자바스크립트가 켜지고 움직임을 허용한 경우에만 등장 전 상태로 숨긴다(설계 §5.1) */
.motion [data-reveal] {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}

@media (max-width: 767px) {
  .container {
    padding-inline: var(--sp-4);
  }
}
```

`tests/e2e/design.spec.ts` 7행 기대값을 `expect(background).toBe('rgb(251, 251, 248)');`로 바꾼다.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected:
- vitest 전체 PASS(새 대비 테스트 24개 포함)
- `astro check` 0 errors

Run: `npm run test:e2e -- tests/e2e/design.spec.ts tests/e2e/print.spec.ts`
Expected: PASS. 인쇄 PDF는 여전히 4장 이하.

- [ ] **Step 5: 커밋**

```bash
git add src/styles/tokens.css src/styles/global.css src/lib/style-rules.test.ts src/lib/contrast.test.ts tests/e2e/design.spec.ts
git commit -m "feat: 종이·도면 색 토큰과 움직임 토큰, 개정된 디자인 규칙 테스트" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: GSAP 설치와 움직임 핵심 모듈

**Files:**
- Modify: `package.json`, `package-lock.json` (`gsap@3.15.0` 추가)
- Create: `src/motion/tokens.ts`, `src/motion/tokens.test.ts`
- Create: `src/motion/mode.ts`, `src/motion/mode.test.ts`
- Create: `src/motion/count.ts`, `src/motion/count.test.ts`
- Create: `src/motion/gsap.ts`, `src/motion/effects.ts`, `src/motion/reveal.ts`, `src/motion/layout.ts`

**Interfaces:**
- Consumes: `tokens.css`의 움직임 토큰(Task 2)
- Produces:
  - `tokens.ts`:
    - `DURATION { fast: 0.2, base: 0.4, slow: 0.8 }`
    - `CURVE { out, inOut, back }`: 각각 `readonly number[]` 4개
    - `EASE { out: 'siteOut', inOut: 'siteInOut', back: 'siteBack' }`
    - `curvePath(curve): string`
  - `mode.ts`:
    - `type MotionMode = 'full' | 'lite' | 'static'`
    - `BREAKPOINT = 768`
    - `MEDIA: Record<MotionMode, string>`
    - `motionMode({ reducedMotion, width }): MotionMode`
  - `count.ts`:
    - `interface CountParts { prefix: string; target: number; suffix: string; grouped: boolean }`
    - `parseCount(text): CountParts | null`
    - `formatCount(parts, n): string`
  - `gsap.ts`: `export { gsap, ScrollTrigger, SplitText }`. 등록된 플러그인은 ScrollTrigger·SplitText·DrawSVGPlugin·CustomEase이고, `EASE`의 세 곡선을 CustomEase로 만든다.
  - `effects.ts`:
    - `shake(target: Element): gsap.core.Timeline`
    - `countUp(el: HTMLElement, text: string, duration?: number): gsap.core.Tween | null`
  - `reveal.ts`:
    - `claim(...targets: Element[]): void`
    - `revealRemaining(root: ParentNode): void`
  - `layout.ts`: `topbarOffset(): number`

- [ ] **Step 1: GSAP 설치**

Run: `npm install --save-exact gsap@3.15.0`
Expected:
- `package.json` dependencies에 `"gsap": "3.15.0"`이 들어간다.
- `npm ls gsap`이 `gsap@3.15.0`을 보인다.
- `node_modules/gsap`에 `ScrollTrigger.js`, `SplitText.js`, `DrawSVGPlugin.js`, `CustomEase.js`가 있다. 확인: `ls node_modules/gsap/ | grep -E "^(ScrollTrigger|SplitText|DrawSVGPlugin|CustomEase)\.js$"`

- [ ] **Step 2: 실패하는 테스트 작성**

`src/motion/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { CURVE, DURATION, curvePath } from './tokens';

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');
const value = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} 없음`);
  return m[1].trim();
};

describe('움직임 토큰은 CSS와 TS가 같다', () => {
  test.each([
    ['dur-fast', DURATION.fast],
    ['dur-base', DURATION.base],
    ['dur-slow', DURATION.slow],
  ] as const)('%s', (name, seconds) => {
    expect(value(name)).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  test.each([
    ['ease-out', CURVE.out],
    ['ease-in-out', CURVE.inOut],
    ['ease-back', CURVE.back],
  ] as const)('%s', (name, curve) => {
    expect(value(name)).toBe(`cubic-bezier(${curve.join(', ')})`);
  });

  test('곡선 경로는 CustomEase가 읽는 SVG 경로다', () => {
    expect(curvePath(CURVE.out)).toBe('M0,0 C0.2,0.8 0.2,1 1,1');
  });
});
```

`src/motion/mode.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { BREAKPOINT, MEDIA, motionMode } from './mode';

describe('motionMode', () => {
  test('움직임 줄임이면 폭과 상관없이 static', () => {
    expect(motionMode({ reducedMotion: true, width: 1440 })).toBe('static');
    expect(motionMode({ reducedMotion: true, width: 390 })).toBe('static');
  });
  test('768px 이상이면 full, 미만이면 lite', () => {
    expect(motionMode({ reducedMotion: false, width: BREAKPOINT })).toBe('full');
    expect(motionMode({ reducedMotion: false, width: BREAKPOINT - 1 })).toBe('lite');
  });
  test('미디어 쿼리는 서로 겹치지 않게 경계를 나눈다', () => {
    expect(MEDIA.full).toContain('(min-width: 768px)');
    expect(MEDIA.lite).toContain('(max-width: 767px)');
    expect(MEDIA.static).toBe('(prefers-reduced-motion: reduce)');
    expect(MEDIA.full).toContain('no-preference');
    expect(MEDIA.lite).toContain('no-preference');
  });
});
```

`src/motion/count.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatCount, parseCount } from './count';

describe('parseCount', () => {
  test('정수 하나', () => {
    expect(parseCount('81')).toEqual({ prefix: '', target: 81, suffix: '', grouped: false });
  });
  test('앞의 수만 세고 나머지는 그대로 둔다', () => {
    expect(parseCount('194/194')).toEqual({ prefix: '', target: 194, suffix: '/194', grouped: false });
  });
  test('앞 글자와 천 단위 쉼표', () => {
    expect(parseCount('약 21,000')).toEqual({ prefix: '약 ', target: 21000, suffix: '', grouped: true });
  });
  test('숫자가 없으면 null', () => {
    expect(parseCount('리뷰 대기')).toBeNull();
  });
});

describe('formatCount', () => {
  test('쉼표가 있던 수는 쉼표를 붙인다', () => {
    const parts = parseCount('약 21,000');
    expect(parts && formatCount(parts, 12345)).toBe('약 12,345');
  });
  test('뒤 글자를 유지한다', () => {
    const parts = parseCount('194/194');
    expect(parts && formatCount(parts, 97)).toBe('97/194');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/motion`
Expected: FAIL(모듈 `./tokens`, `./mode`, `./count` 없음).

- [ ] **Step 4: 모듈 구현**

`src/motion/tokens.ts`:

```ts
// src/styles/tokens.css의 움직임 토큰과 같은 값이다. tokens.test.ts가 두 곳이 같은지 검사한다.
export const DURATION = { fast: 0.2, base: 0.4, slow: 0.8 } as const; // 초(GSAP 단위)

export const CURVE = {
  out: [0.2, 0.8, 0.2, 1],
  inOut: [0.7, 0, 0.3, 1],
  back: [0.34, 1.56, 0.64, 1],
} as const;

// CustomEase로 등록하는 이름(gsap.ts)
export const EASE = { out: 'siteOut', inOut: 'siteInOut', back: 'siteBack' } as const;

export function curvePath([x1, y1, x2, y2]: readonly number[]): string {
  return `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;
}
```

`src/motion/mode.ts`:

```ts
export type MotionMode = 'full' | 'lite' | 'static';

export const BREAKPOINT = 768;

export const MEDIA: Record<MotionMode, string> = {
  full: `(min-width: ${BREAKPOINT}px) and (prefers-reduced-motion: no-preference)`,
  lite: `(max-width: ${BREAKPOINT - 1}px) and (prefers-reduced-motion: no-preference)`,
  static: '(prefers-reduced-motion: reduce)',
};

export function motionMode(env: { reducedMotion: boolean; width: number }): MotionMode {
  if (env.reducedMotion) return 'static';
  return env.width >= BREAKPOINT ? 'full' : 'lite';
}
```

`src/motion/count.ts`:

```ts
export interface CountParts {
  prefix: string;
  target: number;
  suffix: string;
  grouped: boolean;
}

/** "약 21,000"·"194/194"처럼 글자 속 첫 수를 찾아 세어 올릴 수 있게 나눈다. */
export function parseCount(text: string): CountParts | null {
  const m = text.match(/^(\D*?)(\d[\d,]*)([\s\S]*)$/);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  return { prefix, target: Number(digits.replaceAll(',', '')), suffix, grouped: digits.includes(',') };
}

export function formatCount(parts: CountParts, n: number): string {
  const body = parts.grouped ? n.toLocaleString('ko-KR') : String(n);
  return `${parts.prefix}${body}${parts.suffix}`;
}
```

`src/motion/gsap.ts`:

```ts
// GSAP과 플러그인은 이곳에서만 등록한다(설계 §5.2).
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CURVE, DURATION, EASE, curvePath } from './tokens';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
CustomEase.create(EASE.out, curvePath(CURVE.out));
CustomEase.create(EASE.inOut, curvePath(CURVE.inOut));
CustomEase.create(EASE.back, curvePath(CURVE.back));
gsap.defaults({ duration: DURATION.base, ease: EASE.out });

export { gsap, ScrollTrigger, SplitText };
```

`src/motion/effects.ts`:

```ts
import { formatCount, parseCount } from './count';
import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** 불일치가 잡히는 순간의 흔들림(설계 §4.4 강조). 끝나면 제자리로 돌아온다. */
export function shake(target: Element): gsap.core.Timeline {
  return gsap
    .timeline()
    .to(target, { x: -7, rotation: -1.5, duration: 0.05, ease: 'none' })
    .to(target, { x: 7, rotation: 1.5, duration: 0.05, ease: 'none' })
    .to(target, { x: -5, rotation: -1, duration: 0.05, ease: 'none' })
    .to(target, { x: 5, rotation: 1, duration: 0.05, ease: 'none' })
    .to(target, { x: 0, rotation: 0, duration: DURATION.fast, ease: EASE.out });
}

/** 글자 속 첫 수를 0부터 세어 올리고, 끝나면 원래 글자로 되돌린다. */
export function countUp(el: HTMLElement, text: string, duration = DURATION.slow * 1.5): gsap.core.Tween | null {
  const parts = parseCount(text);
  if (!parts) return null;
  const state = { v: 0 };
  el.textContent = formatCount(parts, 0);
  return gsap.to(state, {
    v: parts.target,
    duration,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = formatCount(parts, Math.round(state.v));
    },
    onComplete: () => {
      el.textContent = text;
    },
  });
}
```

`src/motion/reveal.ts`:

```ts
import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** 장면이 직접 움직이는 요소는 기본 등장에서 뺀다. */
export function claim(...targets: Element[]): void {
  for (const el of targets) (el as HTMLElement).dataset.revealClaimed = '';
}

/** 어떤 장면도 맡지 않은 [data-reveal] 요소를 화면에 들어올 때 한 번 올라오게 한다. */
export function revealRemaining(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-claimed])').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: DURATION.base,
        ease: EASE.out,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      },
    );
  });
}
```

`src/motion/layout.ts`:

```ts
/** 고정 상단 바의 높이(px). tokens.css의 --topbar-h를 읽는다. */
export function topbarOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--topbar-h');
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/motion && npx astro check`
Expected:
- vitest의 `src/motion` 테스트 전부 PASS
- `astro check` 0 errors. gsap 타입(`gsap/ScrollTrigger` 등)이 해석된다.

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json src/motion
git commit -m "feat: GSAP 3.15.0과 움직임 핵심 모듈(토큰·모드·숫자 세기·효과·등장)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 공통 레이아웃 — 인라인 클래스, 상단 바, 장면 등록기와 시작 코드

**Files:**
- Create: `src/lib/chapters.ts`, `src/components/TopBar.astro`
- Create: `src/motion/registry.ts`, `src/motion/topbar.ts`, `src/motion/main.ts`, `src/motion/scenes/index.ts`
- Modify: `src/layouts/Base.astro` (전체 교체)
- Modify: `src/components/SectionHeader.astro` (`data-reveal`)
- Modify: `src/pages/index.astro` (`bare`, 섹션마다 `container`)
- Test: `tests/e2e/motion.spec.ts` (생성)

**Interfaces:**
- Consumes: `gsap.ts`, `mode.ts`, `reveal.ts`(Task 3), 토큰(Task 2)
- Produces:
  - `chapters.ts`: `interface Chapter { id: string; label: string }`, `CHAPTERS: Chapter[]`
  - `registry.ts`:
    - `interface SceneContext { mode: MotionMode }`
    - `type Cleanup = () => void`
    - `type SceneSetup = (root: HTMLElement, ctx: SceneContext) => Cleanup | void`
    - `registerScene(name: string, setup: SceneSetup): void`
    - `sceneSetup(name: string): SceneSetup | undefined`
  - `main.ts`: `start(): Promise<void>`. 준비가 끝나면 `html[data-motion="ready"]`를 붙인다.
  - `Base.astro`:
    - Props는 `{ title, description, noindex?, bare? }`이고, `bare`면 `<main>`에 `container`를 붙이지 않는다.
    - `html`에 붙는 클래스는 자바스크립트가 있으면 `js`, 움직임을 허용하면 `motion`, 대체 동작 때는 `motion-failed`이다.
  - `TopBar.astro`:
    - 홈 링크(`.site-header__home`)
    - `[data-chapter-link]` 링크들: `href="/#<id>"`
    - `[data-progress-bar]`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/e2e/motion.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

const hasClass = (page: Page, name: string) =>
  page.evaluate((n) => document.documentElement.classList.contains(n), name);

const hiddenReveals = (page: Page) =>
  page
    .locator('[data-reveal]')
    .evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) < 1).map((e) => e.outerHTML.slice(0, 80)));

async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);
}

test.describe('움직임 켬(데스크톱 기본)', () => {
  test('js·motion 클래스가 붙고 준비 표시가 뜬다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    expect(await hasClass(page, 'js')).toBe(true);
    expect(await hasClass(page, 'motion')).toBe(true);
  });

  test('끝까지 스크롤하면 숨겨졌던 요소가 모두 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    expect(await hiddenReveals(page)).toEqual([]);
  });

  test('진행 막대가 스크롤에 따라 늘어난다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const scale = () =>
      page.locator('[data-progress-bar]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(await scale()).toBeLessThan(0.05);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(scale).toBeGreaterThan(0.95);
  });

  test('장 목차가 홈의 각 장으로 이어진다', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('[data-chapter-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(['/#ml', '/#agent-product', '/#experience', '/#contact']);
    for (const href of hrefs) await expect(page.locator(href!.slice(1))).toHaveCount(1);
  });
});

test.describe('움직임 줄임', () => {
  test.use({ reducedMotion: 'reduce' });

  test('motion 클래스가 없고 내용이 처음부터 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    expect(await hasClass(page, 'js')).toBe(true);
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

test.describe('자바스크립트 없음', () => {
  test.use({ javaScriptEnabled: false });

  test('js 클래스가 없고 내용이 모두 보인다', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.className)).not.toContain('js');
    await expect(page.locator('h1')).toBeVisible();
    expect(await hiddenReveals(page)).toEqual([]);
  });
});
```

주의: 자바스크립트가 없으면 `page.evaluate`가 동작하지 않을 수 있다. 그때는 이 블록의 두 검사를 `const html = await (await page.request.get('/')).text(); expect(html).not.toContain('class="js');`와 `await expect(page.locator('[data-reveal]').first()).toBeVisible();`로 바꾸고, 바꾼 사실을 보고한다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/motion.spec.ts`
Expected: FAIL. `data-motion` 속성, `[data-chapter-link]`, `[data-progress-bar]`가 없다.

- [ ] **Step 3: 장 목록과 상단 바**

`src/lib/chapters.ts`:

```ts
export interface Chapter {
  id: string;
  label: string;
}

// 홈의 장 목차. id는 홈 섹션의 id와 같다.
export const CHAPTERS: Chapter[] = [
  { id: 'ml', label: '정확성' },
  { id: 'agent-product', label: '에이전트·제품' },
  { id: 'experience', label: '경력' },
  { id: 'contact', label: '연락처' },
];
```

`src/components/TopBar.astro`:

```astro
---
import type { Chapter } from '../lib/chapters';

interface Props {
  name: string;
  chapters: Chapter[];
}

const { name, chapters } = Astro.props;
---
<header class="topbar">
  <div class="container container--wide topbar__inner">
    <a class="site-header__home mono" href="/">~/{name}</a>
    <nav aria-label="장 목차">
      <ol class="topbar__chapters">
        {
          chapters.map((c, i) => (
            <li>
              <a href={`/#${c.id}`} data-chapter-link={c.id}>
                <span class="topbar__num mono">{String(i + 1).padStart(2, '0')}</span>{' '}
                <span class="topbar__label">{c.label}</span>
              </a>
            </li>
          ))
        }
      </ol>
    </nav>
  </div>
  <div class="topbar__progress" aria-hidden="true"><span class="topbar__bar" data-progress-bar></span></div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
  }
  .topbar__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-4);
    min-height: calc(var(--topbar-h) - 1px);
  }
  .site-header__home {
    font-size: var(--fs-mono);
    color: var(--text-2);
  }
  .topbar__chapters {
    display: flex;
    gap: var(--sp-4);
    font-size: var(--fs-small);
  }
  .topbar__chapters a {
    color: var(--text-2);
    transition: color var(--dur-fast) var(--ease-out);
  }
  .topbar__chapters a[aria-current] {
    color: var(--text);
  }
  .topbar__num {
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .topbar__progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    overflow: hidden;
  }
  .topbar__bar {
    display: block;
    height: 100%;
    background: var(--blue);
    transform-origin: 0 50%;
    transform: scaleX(0);
  }
  @media (max-width: 767px) {
    .topbar__chapters {
      gap: var(--sp-3);
    }
    .topbar__label {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  }
</style>
```

- [ ] **Step 4: 등록기, 상단 바 연출, 시작 코드**

`src/motion/registry.ts`:

```ts
import type { MotionMode } from './mode';

export interface SceneContext {
  mode: MotionMode;
}

export type Cleanup = () => void;
export type SceneSetup = (root: HTMLElement, ctx: SceneContext) => Cleanup | void;

const scenes = new Map<string, SceneSetup>();

export function registerScene(name: string, setup: SceneSetup): void {
  scenes.set(name, setup);
}

export function sceneSetup(name: string): SceneSetup | undefined {
  return scenes.get(name);
}
```

`src/motion/scenes/index.ts`:

```ts
// 장면 모듈을 불러와 등록한다. 장면을 추가하면 여기에 import를 더한다.
export {};
```

`src/motion/topbar.ts`:

```ts
import { gsap, ScrollTrigger } from './gsap';

/** 진행 막대와 현재 장 표시. 움직임이 아니라 위치 표시이므로 모든 모드에서 쓴다. */
export function startTopbar(): void {
  const bar = document.querySelector<HTMLElement>('[data-progress-bar]');
  if (bar) {
    const setScale = gsap.quickSetter(bar, 'scaleX');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => setScale(self.progress) });
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]').forEach((link) => {
    const section = document.getElementById(link.dataset.chapterLink ?? '');
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      },
    });
  });
}
```

`src/motion/main.ts`:

```ts
import { gsap, ScrollTrigger } from './gsap';
import { MEDIA, type MotionMode } from './mode';
import { type Cleanup, sceneSetup } from './registry';
import { revealRemaining } from './reveal';
import './scenes';
import { startTopbar } from './topbar';

declare global {
  interface Window {
    __motionFallback?: number;
  }
}

export async function start(): Promise<void> {
  const html = document.documentElement;
  if (window.__motionFallback !== undefined) window.clearTimeout(window.__motionFallback);
  html.classList.remove('motion-failed');
  await document.fonts.ready;

  const mm = gsap.matchMedia();
  for (const mode of Object.keys(MEDIA) as MotionMode[]) {
    mm.add(MEDIA[mode], () => {
      html.classList.toggle('motion', mode !== 'static');
      const cleanups: Cleanup[] = [];
      for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'))) {
        const cleanup = sceneSetup(root.dataset.scene ?? '')?.(root, { mode });
        if (cleanup) cleanups.push(cleanup);
      }
      if (mode !== 'static') revealRemaining(document);
      return () => {
        for (const c of cleanups) c();
      };
    });
  }

  startTopbar();
  ScrollTrigger.refresh();
  html.dataset.motion = 'ready';
}
```

- [ ] **Step 5: Base 레이아웃 교체**

`src/layouts/Base.astro`를 다음으로 교체한다. Task 1의 canonical 코드가 이미 들어 있다.

```astro
---
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '../styles/tokens.css';
import '../styles/global.css';
import TopBar from '../components/TopBar.astro';
import { profile } from '../data/profile';
import { CHAPTERS } from '../lib/chapters';

interface Props {
  title: string;
  description: string;
  noindex?: boolean;
  /** true면 main에 container를 붙이지 않는다(홈처럼 장면마다 폭을 정하는 페이지). */
  bare?: boolean;
}

const { title, description, noindex = false, bare = false } = Astro.props;
const canonical = Astro.site ? new URL(Astro.url.pathname, Astro.site).href : undefined;
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
    {canonical && <link rel="canonical" href={canonical} />}
    {canonical && <meta property="og:url" content={canonical} />}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <script is:inline>
      (function () {
        var d = document.documentElement;
        d.classList.add('js');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        d.classList.add('motion');
        // 연출 스크립트가 3초 안에 시작하지 못하면 숨긴 내용을 되살린다(설계 §5.1).
        window.__motionFallback = window.setTimeout(function () {
          d.classList.remove('motion');
          d.classList.add('motion-failed');
        }, 3000);
      })();
    </script>
  </head>
  <body>
    <a class="skip" href="#content">본문으로 건너뛰기</a>
    <TopBar name={profile.name} chapters={CHAPTERS} />
    <main id="content" class:list={[!bare && 'container']}>
      <slot />
    </main>
    <footer class="site-footer">
      <div class="container site-footer__inner">
        <span>© 2026 {profile.name}</span>
        <span>
          이 사이트는 AI 코딩 에이전트와 함께 만들었습니다 ·{' '}
          <a href="https://github.com/wwoosshh/portfolio" target="_blank" rel="noopener noreferrer">소스 ↗</a>
        </span>
      </div>
    </footer>
    <script>
      import { start } from '../motion/main';
      start();
    </script>
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
    z-index: 20;
    background: var(--surface);
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-sm);
  }
  main :global(section[id]) {
    scroll-margin-top: var(--topbar-h);
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

`src/components/SectionHeader.astro`의 `<h2 class="section-header" id={`${id}-title`}>`를 `<h2 class="section-header" id={`${id}-title`} data-reveal>`로 바꾼다.

`src/pages/index.astro`:
- `<Base title={title} description={profile.intro[0]}>`를 `<Base title={title} description={profile.intro[0]} bare>`로 바꾼다.
- `main` 바로 아래의 `<section>` 9개 여는 태그마다 `class="container"`를 더한다. `intro`는 이미 `class="intro"`가 있으므로 `class="intro container"`로 한다.

- [ ] **Step 6: 통과 확인**

Run: `npm run test:e2e -- tests/e2e/motion.spec.ts tests/e2e/home.spec.ts tests/e2e/design.spec.ts tests/e2e/layout.spec.ts`
Expected: 모두 PASS. `design.spec.ts`의 글꼴 검사는 `.site-header__home`을 그대로 찾는다.

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors.

- [ ] **Step 7: 커밋**

```bash
git add src/lib/chapters.ts src/components/TopBar.astro src/components/SectionHeader.astro src/motion src/layouts/Base.astro src/pages/index.astro tests/e2e/motion.spec.ts
git commit -m "feat: 상단 목차·진행 막대와 장면 등록기, JS 없음·움직임 줄임 보장" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 히어로 — 오라클이 조용한 오답을 잡는 장면

**Files:**
- Modify: `src/lib/schema.ts:4` (`httpUrl` 내보내기)
- Create: `src/lib/demo-schema.ts`, `src/lib/demo-schema.test.ts`
- Create: `src/data/hero.ts`
- Create: `src/components/scenes/Hero.astro`, `src/motion/scenes/hero.ts`
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro`
- Test: `tests/e2e/hero.spec.ts` (생성)

**Interfaces:**
- Consumes:
  - `effects.ts`의 `countUp`·`shake`, `reveal.ts`의 `claim`, `registry.ts`의 `registerScene` (Task 3·4)
  - `Button.astro`
- Produces:
  - `schema.ts`: `export const httpUrl`
  - `demo-schema.ts`:
    - `sourceSchema`, `provenanceSchema`, `heroSchema`
    - `type Provenance`, `type Hero`
    - 계획 2의 시연 데이터가 `provenanceSchema`를 재사용한다.
  - `hero.ts`: `hero: Hero`
  - `Hero.astro`:
    - Props `{ profile: Profile; pdfName: string }`
    - `section#intro[data-scene="hero"]`를 그리고, `h1`은 `profile.headline`이다.
    - 표시(hook): `[data-count]`, `[data-mismatch]`, `[data-flag]`, `.hero__tick`

- [ ] **Step 1: 원본 확인**

Run: `gh issue view 198094 -R pytorch/pytorch --json body --jq .body | sed -n '5,22p'`

Expected: 다음을 확인한다. 값이 다르면 이후 코드의 값을 원본대로 고치고 보고한다.
- 재현 함수 `fn(x, src)`의 세 줄: `torch.slice_scatter(x, src[1:3], dim=0, start=1, end=3)`, `x.zero_()`, `return y`
- 출력 두 줄: `[0, 1, 2, 3, 4, 5, -6, -5]      # eager`, `[0, 0, 0, 0, 0, 0, 0, 0]        # inductor`
- 환경: torch 2.14.0+cu130, CUDA

Run: `gh api "repos/wwoosshh/AI-accelerator-compiler/contents/fuzz/README.md?ref=afcfac2376eeaa03f822ea5ea0d09e897f092ef8" --jq .content | base64 -d | sed -n '4,5p'`
Expected: 4행에 "약 21,000개 프로그램(45분)"이 있다.

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/demo-schema.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { heroSchema, provenanceSchema } from './demo-schema';

const provenance = {
  sources: [{ url: 'https://github.com/pytorch/pytorch/issues/198094' }],
  extractedBy: 'gh issue view 198094',
  verifiedAt: '2026-09-30',
};

const validHero = {
  runs: { approx: 21000, minutes: 45 },
  sample: {
    issue: 198094,
    url: 'https://github.com/pytorch/pytorch/issues/198094',
    summary: '요약',
    code: 'def fn(x): ...',
    eager: '[1]',
    compiled: '[0]',
    compiledLabel: 'inductor',
    env: 'torch 2.14.0',
  },
  provenance,
};

describe('provenanceSchema', () => {
  test('출처가 하나 이상 있어야 한다', () => {
    expect(provenanceSchema.safeParse({ ...provenance, sources: [] }).success).toBe(false);
  });
  test('sha는 40자리 16진수여야 한다', () => {
    const bad = { ...provenance, sources: [{ url: 'https://github.com/x/y', sha: 'afcfac2' }] };
    expect(provenanceSchema.safeParse(bad).success).toBe(false);
  });
  test('확인 날짜는 YYYY-MM-DD', () => {
    expect(provenanceSchema.safeParse({ ...provenance, verifiedAt: '2026.09.30' }).success).toBe(false);
  });
});

describe('heroSchema', () => {
  test('올바른 히어로 데이터는 통과한다', () => {
    expect(heroSchema.safeParse(validHero).success).toBe(true);
  });
  test('두 결과가 같으면 실패한다(히어로는 불일치 예시여야 한다)', () => {
    const same = { ...validHero, sample: { ...validHero.sample, compiled: '[1]' } };
    expect(heroSchema.safeParse(same).success).toBe(false);
  });
  test('url과 이슈 번호가 다르면 실패한다', () => {
    const wrong = { ...validHero, sample: { ...validHero.sample, issue: 1 } };
    expect(heroSchema.safeParse(wrong).success).toBe(false);
  });
});
```

`tests/e2e/hero.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { hero } from '../../src/data/hero';

test.describe('히어로(움직임 줄임: 최종 상태)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('실행 수, 실제 두 결과, 판정, 이슈 링크가 처음부터 보인다', async ({ page }) => {
    await page.goto('/');
    const oracle = page.locator('.hero__oracle');
    await expect(oracle).toContainText('약 21,000개 · 45분');
    await expect(oracle).toContainText(hero.sample.eager);
    await expect(oracle).toContainText(hero.sample.compiled);
    await expect(oracle).toContainText('조용한 오답');
    await expect(oracle.locator(`a[href="${hero.sample.url}"]`)).toContainText('↗');
  });
});

test.describe('히어로(움직임 켬)', () => {
  test('연출이 끝나면 불일치가 표시되고 제목 글자가 그대로다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('[data-mismatch]')).toHaveClass(/is-flagged/, { timeout: 5000 });
    await expect(page.locator('[data-count]')).toHaveText('약 21,000', { timeout: 5000 });
    await expect(page.locator('h1')).toHaveText('정확성을 검증하는 AI/ML 시스템 엔지니어');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/demo-schema.test.ts`
Expected: FAIL(모듈 `./demo-schema` 없음).

- [ ] **Step 4: 스키마와 데이터**

`src/lib/schema.ts` 4행을 `export const httpUrl = z.url({ protocol: /^https?$/ });`로 바꾼다.

`src/lib/demo-schema.ts`:

```ts
import { z } from 'astro/zod';
import { httpUrl } from './schema';

// 연출·시연에 쓰는 실제 데이터의 출처(설계 §7). 원본에 없는 값은 넣지 않는다.
export const sourceSchema = z.strictObject({
  url: httpUrl,
  sha: z.string().regex(/^[0-9a-f]{40}$/, '커밋 SHA는 40자리 16진수여야 합니다').optional(),
  lines: z.string().regex(/^L\d+(-L\d+)?$/, '줄 표기는 L10 또는 L10-L12 형식이어야 합니다').optional(),
  note: z.string().min(1).optional(),
});

export const provenanceSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1, '출처가 하나 이상 있어야 합니다'),
  extractedBy: z.string().min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '확인 날짜는 YYYY-MM-DD 형식이어야 합니다'),
});

export const heroSchema = z.strictObject({
  runs: z.strictObject({ approx: z.number().int().positive(), minutes: z.number().int().positive() }),
  sample: z
    .strictObject({
      issue: z.number().int().positive(),
      url: httpUrl,
      summary: z.string().min(1),
      code: z.string().min(1),
      eager: z.string().min(1),
      compiled: z.string().min(1),
      compiledLabel: z.string().min(1),
      env: z.string().min(1),
    })
    .refine((s) => s.eager !== s.compiled, { message: '히어로 예시는 두 결과가 달라야 합니다' })
    .refine((s) => s.url.endsWith(`/issues/${s.issue}`), { message: 'url과 이슈 번호가 맞지 않습니다' }),
  provenance: provenanceSchema,
});

export type Provenance = z.infer<typeof provenanceSchema>;
export type Hero = z.infer<typeof heroSchema>;
```

`src/data/hero.ts`:

```ts
import { heroSchema } from '../lib/demo-schema';

// 히어로 오라클 장면의 실제 데이터. 값은 원본에서 그대로 옮겼다(설계 §7).
export const hero = heroSchema.parse({
  runs: { approx: 21000, minutes: 45 },
  sample: {
    issue: 198094,
    url: 'https://github.com/pytorch/pytorch/issues/198094',
    summary: 'scatter 결과를 입력 버퍼에 제자리 연산으로 바꿔 넣어, 뒤따르는 x.zero_()가 반환값까지 0으로 덮어씁니다.',
    code: [
      'def fn(x, src):',
      '    y = torch.slice_scatter(x, src[1:3], dim=0, start=1, end=3)',
      '    x.zero_()',
      '    return y',
    ].join('\n'),
    eager: '[0, 1, 2, 3, 4, 5, -6, -5]',
    compiled: '[0, 0, 0, 0, 0, 0, 0, 0]',
    compiledLabel: 'inductor',
    env: 'torch 2.14.0+cu130 · CUDA',
  },
  provenance: {
    sources: [
      { url: 'https://github.com/pytorch/pytorch/issues/198094', note: '재현 함수와 두 출력(본문 코드 블록)' },
      {
        url: 'https://github.com/wwoosshh/AI-accelerator-compiler/blob/afcfac2376eeaa03f822ea5ea0d09e897f092ef8/fuzz/README.md?plain=1#L4-L5',
        sha: 'afcfac2376eeaa03f822ea5ea0d09e897f092ef8',
        lines: 'L4-L5',
        note: '약 21,000개 프로그램(45분)',
      },
    ],
    extractedBy: 'gh issue view 198094 -R pytorch/pytorch --json body (코드 블록을 그대로 복사)',
    verifiedAt: '2026-09-30',
  },
});
```

- [ ] **Step 5: 히어로 마크업**

`src/components/scenes/Hero.astro`:

```astro
---
import { hero } from '../../data/hero';
import type { Profile } from '../../lib/schema';
import Button from '../Button.astro';

interface Props {
  profile: Profile;
  pdfName: string;
}

const { profile, pdfName } = Astro.props;
const runs = hero.runs.approx.toLocaleString('ko-KR');
const TICKS = 32;
---
<section id="intro" class="hero container container--wide" aria-labelledby="intro-title" data-scene="hero">
  <div class="hero__text">
    <p class="hero__kicker mono" data-reveal>~/{profile.name} · {profile.nameEn}</p>
    <h1 id="intro-title" class="hero__title" data-reveal>
      <span class="mark">{profile.headline.mark}</span>{' '}{profile.headline.rest}
    </h1>
    <div class="hero__lead">{profile.intro.map((text) => <p data-reveal>{text}</p>)}</div>
    <div class="hero__actions" data-reveal>
      <Button href={profile.contact.github} label="GitHub" external />
      {profile.contact.email && <Button href={`mailto:${profile.contact.email}`} label="이메일" />}
      <Button href="/portfolio.pdf" label="PDF" download={pdfName} />
    </div>
  </div>

  <figure class="hero__oracle panel" aria-labelledby="oracle-caption">
    <p class="hero__count mono">
      <span class="hero__count-label">실행한 프로그램</span>{' '}<strong data-count>약 {runs}</strong>개 · {hero.runs.minutes}분
    </p>
    <div class="hero__ticks" aria-hidden="true">{Array.from({ length: TICKS }, () => <span class="hero__tick" />)}</div>
    <pre class="hero__code mono" data-reveal><code>{hero.sample.code}</code></pre>
    <dl class="hero__rows mono">
      <div class="hero__row" data-reveal>
        <dt>eager</dt>
        <dd>{hero.sample.eager}</dd>
      </div>
      <div class="hero__row hero__row--bad" data-reveal data-mismatch>
        <dt>{hero.sample.compiledLabel}</dt>
        <dd>{hero.sample.compiled}</dd>
      </div>
    </dl>
    <p class="hero__flag mono" data-reveal data-flag><span aria-hidden="true">✗</span> 조용한 오답 · 오류 없이 값만 다름</p>
    <figcaption id="oracle-caption" class="hero__caption" data-reveal>
      {hero.sample.summary}{' '}
      <a class="mono" href={hero.sample.url} target="_blank" rel="noopener noreferrer">pytorch#{hero.sample.issue} <span aria-hidden="true">↗</span></a>
      <span class="hero__env mono">{hero.sample.env} · 출력 앞 8개 값 · 퍼저가 돌린 약 {runs}개 프로그램에서 찾은 계열 중 하나</span>
    </figcaption>
  </figure>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: var(--sp-12);
    align-items: center;
    min-height: calc(100vh - var(--topbar-h));
    padding-block: var(--sp-12);
  }
  .hero__kicker {
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  .hero__title {
    font-size: var(--fs-hero);
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -0.03em;
    margin-top: var(--sp-3);
  }
  .hero__lead {
    display: grid;
    gap: var(--sp-2);
    max-width: var(--w-text);
    margin-top: var(--sp-6);
    color: var(--text-2);
  }
  .hero__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    margin-top: var(--sp-6);
  }
  .hero__oracle {
    display: grid;
    gap: var(--sp-3);
    padding: var(--sp-6);
  }
  .hero__count {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .hero__count strong {
    font-size: 1.5rem;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .hero__ticks {
    display: grid;
    grid-template-columns: repeat(16, minmax(0, 1fr));
    gap: var(--sp-1);
  }
  .hero__tick {
    height: 6px;
    background: var(--ok-line);
  }
  .hero__code {
    margin: 0;
    padding: var(--sp-3);
    overflow-x: auto;
    font-size: var(--fs-mono);
    line-height: 1.6;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
  }
  .hero__rows {
    display: grid;
    gap: var(--sp-1);
    font-size: var(--fs-mono);
  }
  .hero__row {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    gap: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--r-sm);
  }
  .hero__row dt {
    color: var(--text-3);
  }
  .hero__row--bad {
    color: var(--bad);
    background: var(--bad-bg);
    transition:
      color var(--dur-base) var(--ease-out),
      background-color var(--dur-base) var(--ease-out);
  }
  :global(.motion) .hero__row--bad:not(.is-flagged) {
    color: var(--text);
    background: transparent;
  }
  .hero__flag {
    justify-self: start;
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-mono);
    color: var(--bad);
    background: var(--bad-bg);
    border: 1px solid var(--bad-line);
    border-radius: var(--r-sm);
  }
  .hero__caption {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .hero__env {
    display: block;
    margin-top: var(--sp-1);
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  @media (max-width: 767px) {
    .hero {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-8);
      min-height: auto;
    }
  }
</style>
```

- [ ] **Step 6: 히어로 연출**

`src/motion/scenes/hero.ts`:

```ts
import { countUp, shake } from '../effects';
import { gsap, SplitText } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('hero', (root, { mode }) => {
  if (mode === 'static') return;
  const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const title = root.querySelector<HTMLElement>('.hero__title');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const mismatch = root.querySelector<HTMLElement>('[data-mismatch]');
  if (!title || !count || !mismatch) return;

  const kicker = all('.hero__kicker');
  const code = all('.hero__code');
  const rows = all('.hero__row');
  const flag = all('[data-flag]');
  const after = all('.hero__lead p, .hero__actions, .hero__caption');
  claim(title, ...kicker, ...code, ...rows, ...flag, ...after);

  const split = new SplitText(title, { type: 'words' });
  const finalCount = count.textContent ?? '';
  const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DURATION.base } });
  tl.set(title, { autoAlpha: 1 })
    .fromTo(kicker, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(all('.hero__tick'), { scale: 0 }, { scale: 1, stagger: 0.025, duration: DURATION.fast }, 0)
    .fromTo(split.words, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, stagger: 0.05, duration: DURATION.slow }, 0.3)
    .fromTo(code, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0 }, 0.4)
    .fromTo(rows, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.15 }, 0.8)
    .fromTo(root.querySelector('.hero__title .mark'), { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: DURATION.slow }, 0.9)
    .fromTo(after, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08 }, 1.0)
    .add(() => mismatch.classList.add('is-flagged'), 1.4)
    .add(shake(mismatch), 1.4)
    .fromTo(flag, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0 }, 1.7);
  const counter = countUp(count, finalCount, 1.6);
  if (counter) tl.add(counter, 0);

  return () => {
    tl.kill();
    split.revert();
    mismatch.classList.remove('is-flagged');
    count.textContent = finalCount;
  };
});
```

`src/motion/scenes/index.ts`를 다음으로 바꾼다.

```ts
// 장면 모듈을 불러와 등록한다. 장면을 추가하면 여기에 import를 더한다.
import './hero';
```

`src/pages/index.astro`:
- 프런트매터에 `import Hero from '../components/scenes/Hero.astro';`를 추가한다.
- `<section id="intro" ...>…</section>` 블록 전체를 `<Hero profile={profile} pdfName={pdfName} />`로 바꾼다.
- `<style>`에서 `.intro`, `.intro__kicker`, `.intro__title`, `.intro__lead`, `.intro__actions` 규칙과 767px 미디어 쿼리 안의 `.intro`·`.intro__title` 규칙을 지운다.
- 더 이상 쓰지 않는 `Button` import도 지운다. 다른 곳에서 쓰면 남긴다.

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors.

Run: `npm run test:e2e -- tests/e2e/hero.spec.ts tests/e2e/home.spec.ts tests/e2e/motion.spec.ts tests/e2e/layout.spec.ts`
Expected: 모두 PASS. `home.spec.ts`의 소개 테스트(`#intro a[...]`, h1 문구)도 그대로 통과한다.

SplitText가 제목 사이의 공백을 바꿔 `toHaveText`가 실패하면 다음 순서로 처리한다.
1. `new SplitText(title, { type: 'words', wordDelimiter: ' ' })`로 다시 시험한다.
2. 그래도 실패하면 멈추고 보고한다(BLOCKED).

- [ ] **Step 8: 커밋**

```bash
git add src/lib/schema.ts src/lib/demo-schema.ts src/lib/demo-schema.test.ts src/data/hero.ts src/components/scenes/Hero.astro src/motion/scenes src/pages/index.astro tests/e2e/hero.spec.ts
git commit -m "feat: 히어로 — 퍼저 실제 데이터로 조용한 오답을 잡는 오라클 장면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 핵심 성과 — 튕기며 자리 잡는 숫자

**Files:**
- Modify: `src/lib/schema.ts` (`highlightSchema`에 `figure`)
- Modify: `src/lib/schema.test.ts` (프로필 예시에 `figure`, 형식 검사 테스트)
- Modify: `src/data/profile.ts` (`highlights[].figure`)
- Create: `src/components/scenes/Highlights.astro`, `src/motion/scenes/highlights.ts`
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro`
- Test: `tests/e2e/highlights.spec.ts` (생성)

**Interfaces:**
- Consumes: `countUp`(Task 3), `claim`, `registerScene`, `Status`, `Evidence`, `SectionHeader`
- Produces:
  - `Profile['highlights'][number]['figure']`: `{ value: string; unit: string }`. `value`는 `/^\d[\d,]*(\/\d[\d,]*)?$/` 형식이다.
  - `Highlights.astro`:
    - Props `{ profile: Profile }`
    - `section#highlights[data-scene="highlights"]`를 그린다.
    - 표시: `.hl__item`, `[data-figure]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/schema.test.ts`의 `validProfile.highlights` 항목에 `figure: { value: String(n), unit: '건' },`을 넣는다. 그리고 `describe('profileSchema'` 안에 다음 테스트를 추가한다.

```ts
  test('핵심 성과의 큰 숫자는 숫자 또는 숫자/숫자 형식이다', () => {
    const bad = {
      ...validProfile,
      highlights: validProfile.highlights.map((h) => ({ ...h, figure: { value: '여섯', unit: '건' } })),
    };
    expect(profileSchema.safeParse(bad).success).toBe(false);
  });
```

`tests/e2e/highlights.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profile } from '../../src/data/profile';

test.describe('핵심 성과(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('성과마다 큰 숫자·단위·근거가 보인다', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('#highlights .hl__item');
    await expect(items).toHaveCount(profile.highlights.length);
    for (const [i, h] of profile.highlights.entries()) {
      await expect(items.nth(i).locator('[data-figure]')).toHaveText(h.figure.value);
      await expect(items.nth(i)).toContainText(h.figure.unit);
      await expect(items.nth(i).locator('a.evidence')).toHaveCount(1);
    }
  });
});

test.describe('핵심 성과(움직임 켬)', () => {
  test('화면에 들어오면 숫자가 세어 올라가 원래 값에서 멈춘다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#highlights').scrollIntoViewIfNeeded();
    for (const [i, h] of profile.highlights.entries()) {
      await expect(page.locator('#highlights [data-figure]').nth(i)).toHaveText(h.figure.value, { timeout: 5000 });
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL. `figure`가 알 수 없는 키라서 strict 스키마가 거부한다.

- [ ] **Step 3: 스키마와 데이터**

`src/lib/schema.ts`의 `highlightSchema`:

```ts
const highlightSchema = z.strictObject({
  label: z.string().min(1),
  detail: z.string().min(1),
  status: statusToneSchema,
  statusText: z.string().min(1),
  evidence: httpUrl,
  // 큰 숫자. 라벨·설명에 이미 있는 사실만 쓴다.
  figure: z.strictObject({
    value: z.string().regex(/^\d[\d,]*(\/\d[\d,]*)?$/, '숫자 또는 숫자/숫자 형식이어야 합니다'),
    unit: z.string().min(1),
  }),
});
```

`src/data/profile.ts`의 `highlights` 네 항목에 `figure`를 추가한다. 각 값은 같은 항목의 라벨·설명에 있는 사실이다.
- 첫째: `figure: { value: '6', unit: '건 보고' },` (PyTorch 버그 6건 보고)
- 둘째: `figure: { value: '2', unit: '개 엔진' },` (vLLM·SGLang)
- 셋째: `figure: { value: '194/194', unit: '통과' },` (2세대 수용 테스트 194/194)
- 넷째: `figure: { value: '81', unit: '건 머지' },` (main 브랜치에 머지된 PR 81건)

- [ ] **Step 4: 마크업과 연출**

`src/components/scenes/Highlights.astro`:

```astro
---
import { formatDate } from '../../lib/format';
import type { Profile } from '../../lib/schema';
import { view } from '../../lib/status';
import Evidence from '../Evidence.astro';
import SectionHeader from '../SectionHeader.astro';
import Status from '../Status.astro';

interface Props {
  profile: Profile;
}

const { profile } = Astro.props;
---
<section id="highlights" class="container container--wide" aria-labelledby="highlights-title" data-scene="highlights">
  <SectionHeader id="highlights" title="핵심 성과" note={`${formatDate(profile.asOf)} 기준`} />
  <ul class="hl">
    {
      profile.highlights.map((h) => (
        <li class="hl__item" data-reveal>
          <p class="hl__figure">
            <span class="hl__num" data-figure>{h.figure.value}</span>
            <span class="hl__unit">{h.figure.unit}</span>
          </p>
          <Status view={view(h.status, h.statusText)} />
          <p class="hl__label">{h.label}</p>
          <p class="hl__detail">{h.detail}</p>
          <Evidence evidence={h.evidence} />
        </li>
      ))
    }
  </ul>
</section>

<style>
  .hl {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--sp-6);
  }
  .hl__item {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    padding-top: var(--sp-3);
    border-top: 2px solid var(--text);
  }
  .hl__figure {
    display: flex;
    align-items: baseline;
    gap: var(--sp-1);
  }
  .hl__num {
    display: inline-block;
    font-size: var(--fs-figure);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  .hl__unit {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .hl__label {
    font-weight: 700;
  }
  .hl__detail {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  @media (max-width: 1023px) {
    .hl {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 767px) {
    .hl {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
```

`src/motion/scenes/highlights.ts`:

```ts
import { countUp } from '../effects';
import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('highlights', (root, { mode }) => {
  if (mode === 'static') return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('.hl__item'));
  const nums = items.map((item) => item.querySelector<HTMLElement>('[data-figure]')).filter((n): n is HTMLElement => n !== null);
  const finals = nums.map((n) => n.textContent ?? '');
  claim(...items);

  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 75%', once: true } });
  tl.fromTo(items, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.1 }).fromTo(
    nums,
    { y: -60, rotation: -10, autoAlpha: 0 },
    { y: 0, rotation: 0, autoAlpha: 1, ease: EASE.back, duration: DURATION.slow, stagger: 0.12 },
    0.1,
  );
  nums.forEach((n, i) => {
    const counter = countUp(n, finals[i]);
    if (counter) tl.add(counter, 0.1 + i * 0.12);
  });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    nums.forEach((n, i) => {
      n.textContent = finals[i];
    });
  };
});
```

`src/motion/scenes/index.ts`에 `import './highlights';`를 추가한다.

`src/pages/index.astro`:
- `import Highlights from '../components/scenes/Highlights.astro';`를 추가한다.
- `<section id="highlights" ...>…</section>` 블록을 `<Highlights profile={profile} />`로 바꾼다.
- `<style>`의 `.highlight`, `.highlight__label`, `.highlight__detail` 규칙을 지운다. `.highlight__detail`과 함께 묶인 `.principle__body`는 남긴다.
- 더 이상 쓰지 않는 import(`formatDate`, `view`, `Status`, `Evidence` 등)를 지운다.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors.

Run: `npm run test:e2e -- tests/e2e/highlights.spec.ts tests/e2e/home.spec.ts tests/e2e/motion.spec.ts tests/e2e/print.spec.ts`
Expected: PASS. `home.spec.ts`의 "핵심 성과는 3~4개이고 모두 근거 링크가 있다"는 `#highlights li` 4개를 그대로 찾는다. 인쇄 PDF는 4장 이하다.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/schema.ts src/lib/schema.test.ts src/data/profile.ts src/components/scenes/Highlights.astro src/motion/scenes src/pages/index.astro tests/e2e/highlights.spec.ts
git commit -m "feat: 핵심 성과 — 큰 숫자가 튕기며 자리 잡고 세어 올라가는 장면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 장 간지와 1장 대표작 장면

**Files:**
- Create: `src/components/scenes/ChapterCard.astro`, `src/components/scenes/ProjectScene.astro`
- Create: `src/motion/scenes/chapter.ts`, `src/motion/scenes/project.ts`
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro` (`#ml`)
- Test: `tests/e2e/chapters.spec.ts` (생성)

**Interfaces:**
- Consumes: `ProjectEntry`(`src/lib/site.ts`), `Evidence`, `formatPeriod`, `formatDate`, `claim`, `registerScene`
- Produces:
  - `ChapterCard.astro`: Props `{ id: string; num: string; title: string; lead: string }`. `header[data-scene="chapter"]`를 그리고, 그 안의 `h2#<id>-title`이 섹션 제목이다.
  - `ProjectScene.astro`: Props `{ project: ProjectEntry; num: string }`. `article[data-scene="project"][data-project=<id>]`를 그린다.
    - 제목 링크는 `a[data-detail-link]`이고 `href="/projects/<id>/"`이다.
    - 수치 패널은 `.pscene__panel.panel`이다. 계획 2가 이 패널 자리에 시연을 넣는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/e2e/chapters.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('1장(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('간지 제목과 대표작 4개의 수치 패널이 근거와 함께 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#ml-title')).toHaveText('정확성');
    const scenes = page.locator('#ml article[data-project]');
    await expect(scenes).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const metrics = scenes.nth(i).locator('.pscene__metric');
      expect(await metrics.count()).toBeGreaterThan(0);
      for (let j = 0; j < (await metrics.count()); j++) {
        await expect(metrics.nth(j).locator('.evidence')).toHaveCount(1);
      }
    }
  });
});

test.describe('장 간지(움직임 켬)', () => {
  test('스크롤해 지나가면 간지가 3D 전환을 마치고 평면으로 선다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#ml').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await expect
      .poll(() => page.locator('#ml-title').evaluate((el) => getComputedStyle(el).transform), { timeout: 5000 })
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/chapters.spec.ts`
Expected: FAIL. `#ml-title`의 글자가 "// 대표 프로젝트 · …"이고, `#ml article[data-project]`가 없다.

- [ ] **Step 3: 마크업**

`src/components/scenes/ChapterCard.astro`:

```astro
---
interface Props {
  id: string;
  num: string;
  title: string;
  lead: string;
}

const { id, num, title, lead } = Astro.props;
---
<header class="chapter" data-scene="chapter">
  <p class="chapter__num mono" data-reveal>{num}</p>
  <h2 id={`${id}-title`} class="chapter__title" data-reveal><span class="mark">{title}</span></h2>
  <p class="chapter__lead" data-reveal>{lead}</p>
</header>

<style>
  .chapter {
    display: grid;
    align-content: center;
    gap: var(--sp-3);
    min-height: 60vh;
    padding-block: var(--sp-16);
    perspective: 1200px;
  }
  .chapter__num {
    font-size: var(--fs-mono);
    color: var(--blue);
  }
  .chapter__title {
    font-size: var(--fs-chapter);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .chapter__lead {
    max-width: var(--w-text);
    font-size: var(--fs-h3);
    color: var(--text-2);
  }
</style>
```

`src/components/scenes/ProjectScene.astro`:

```astro
---
import { formatDate, formatPeriod } from '../../lib/format';
import type { ProjectEntry } from '../../lib/site';
import Evidence from '../Evidence.astro';

interface Props {
  project: ProjectEntry;
  num: string;
}

const { project, num } = Astro.props;
const d = project.data;
const href = `/projects/${project.id}/`;
---
<article class="pscene" data-scene="project" data-project={project.id}>
  <div class="pscene__text">
    <p class="pscene__num mono" data-reveal>{num}</p>
    <h3 class="pscene__title" data-reveal><a href={href} data-detail-link>{d.title}</a></h3>
    <p class="pscene__meta mono" data-reveal>{formatPeriod(d.period)} · {d.role}</p>
    <p class="pscene__tagline" data-reveal>{d.tagline}</p>
    <p data-reveal><a class="pscene__more mono" href={href}>자세히 보기 →</a></p>
  </div>
  <div class="pscene__panel panel" data-reveal>
    <p class="pscene__asof mono">{formatDate(d.asOf)} 기준</p>
    <ul class="pscene__metrics">
      {
        d.metrics.map((m) => (
          <li class="pscene__metric">
            <span class="pscene__metric-label">{m.label}</span>
            <strong class="pscene__metric-value mono">{m.value}</strong>
            <Evidence evidence={m.evidence} />
          </li>
        ))
      }
    </ul>
  </div>
</article>

<style>
  .pscene {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: var(--sp-12);
    align-items: center;
    padding-block: var(--sp-16);
    border-top: 1px solid var(--line);
  }
  .pscene__text {
    display: grid;
    gap: var(--sp-3);
  }
  .pscene__num {
    font-size: var(--fs-mono);
    color: var(--blue);
  }
  .pscene__title {
    font-size: var(--fs-display);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .pscene__title a {
    color: var(--text);
  }
  .pscene__meta {
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .pscene__tagline {
    color: var(--text-2);
  }
  .pscene__more {
    font-size: var(--fs-mono);
  }
  .pscene__panel {
    display: grid;
    gap: var(--sp-3);
    padding: var(--sp-6);
  }
  .pscene__asof {
    font-size: var(--fs-tag);
    color: var(--text-3);
  }
  .pscene__metrics {
    display: grid;
    gap: var(--sp-3);
  }
  .pscene__metric {
    display: grid;
    gap: var(--sp-1);
    padding: var(--sp-3);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
  }
  .pscene__metric-label {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .pscene__metric-value {
    font-size: 1.25rem;
  }
  @media (max-width: 767px) {
    .pscene {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-6);
      padding-block: var(--sp-12);
    }
  }
</style>
```

- [ ] **Step 4: 연출**

`src/motion/scenes/chapter.ts` (설계 §4.4 강조 — 3D로 뒤집히는 장 전환):

```ts
import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('chapter', (root, { mode }) => {
  if (mode === 'static') return;
  const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  const mark = root.querySelector<HTMLElement>('.chapter__title .mark');
  claim(...parts);

  const scrollTrigger =
    mode === 'full'
      ? { trigger: root, start: 'top 85%', end: 'top 30%', scrub: 0.6 }
      : { trigger: root, start: 'top 80%', once: true };
  const tl = gsap.timeline({ scrollTrigger });
  tl.fromTo(
    parts,
    { autoAlpha: 0, rotationX: -70, y: 40, transformOrigin: '50% 100%' },
    { autoAlpha: 1, rotationX: 0, y: 0, stagger: 0.12, ease: EASE.inOut, duration: DURATION.slow },
  );
  if (mark) tl.fromTo(mark, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: DURATION.slow }, '>-0.3');

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
});
```

`src/motion/scenes/project.ts`:

```ts
import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION } from '../tokens';

registerScene('project', (root, { mode }) => {
  if (mode === 'static') return;
  const text = Array.from(root.querySelectorAll<HTMLElement>('.pscene__text [data-reveal]'));
  const panel = root.querySelector<HTMLElement>('.pscene__panel');
  const metrics = Array.from(root.querySelectorAll<HTMLElement>('.pscene__metric'));
  if (!panel) return;
  claim(...text, panel);

  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 75%', once: true } });
  tl.fromTo(text, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.08 })
    .fromTo(panel, { autoAlpha: 0, x: mode === 'full' ? 40 : 0, y: mode === 'full' ? 0 : 20 }, { autoAlpha: 1, x: 0, y: 0, duration: DURATION.slow }, 0.1)
    .fromTo(metrics, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08 }, 0.4);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
});
```

`src/motion/scenes/index.ts`에 `import './chapter';`와 `import './project';`를 추가한다.

`src/pages/index.astro`:
- `import ChapterCard from '../components/scenes/ChapterCard.astro';`와 `import ProjectScene from '../components/scenes/ProjectScene.astro';`를 추가한다.
- `#ml` 섹션을 다음으로 바꾼다.

```astro
  <section id="ml" class="container container--wide" aria-labelledby="ml-title">
    <ChapterCard id="ml" num="1장" title="정확성" lead="AI/ML 시스템과 컴파일러" />
    {site.ml.map((p, i) => <ProjectScene project={p} num={`1-${i + 1}`} />)}
  </section>
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors.

Run: `npm run test:e2e -- tests/e2e/chapters.spec.ts tests/e2e/content.spec.ts tests/e2e/home.spec.ts tests/e2e/layout.spec.ts tests/e2e/motion.spec.ts`
Expected: 모두 PASS.
- `content.spec.ts`의 `#ml [data-project]` 순서(entail, torch-compile-fuzzer, geul-lang, inversa-bench)가 그대로다.
- `layout.spec.ts`의 제목 계층(h1 → h2 → h3)이 맞다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/scenes/ChapterCard.astro src/components/scenes/ProjectScene.astro src/motion/scenes src/pages/index.astro tests/e2e/chapters.spec.ts
git commit -m "feat: 3D로 넘어오는 장 간지와 1장 대표작 수치 장면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 2장 가로 구간과 움직이는 도면 4개

**Files:**
- Create: `src/styles/diagram.css`
- Create: `src/components/diagrams/AsahiDiagram.astro`, `BarunDiagram.astro`, `MzcubeDiagram.astro`, `NogadaDiagram.astro`, `Diagram.astro`
- Create: `src/components/scenes/BuildDeck.astro`, `src/motion/scenes/deck.ts`
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro` (`#agent-product`)
- Test: `tests/e2e/deck.spec.ts` (생성)

**Interfaces:**
- Consumes:
  - `ChapterCard`(Task 7), `Status`, `Evidence`, `deploymentStatus`
  - `topbarOffset`(Task 3), `claim`, `registerScene`
- Produces:
  - `Diagram.astro`: Props `{ id: string }`. 도면이 없는 id면 아무것도 그리지 않는다.
  - 각 도면:
    - `svg.dg[role="img"]`이고, `<title>`·`<desc>`를 갖는다.
    - 움직임 표시: `[data-draw]`(선 그리기), `[data-pop]`(튀어나오기), `[data-fade]`(나타나기)
  - `BuildDeck.astro`:
    - Props `{ projects: ProjectEntry[] }`
    - `div.deck[data-scene="deck"]` 안에 `li.deck__slide[data-project]`와 `button[data-deck-skip]`을 그린다.
    - full 모드에서는 `deck[data-pinned]`가 붙는다.

- [ ] **Step 1: 사실 확인**

도면 글자는 모두 v1 콘텐츠에서 이미 검증한 사실만 쓴다. 쓰기 전에 다음 문장을 읽어 대조한다.
- `src/content/projects/asahi.mdx`의 "## 접근" 첫째·둘째 항목:
  - 봇이 디스코드·DB·모델 자격증명을 가진다.
  - 워커는 허브에 아웃바운드로 접속하고 토큰 하나만 가진다.
  - 봇은 워커 토큰을 sha256 해시로만 저장한다.
  - GitHub App 토큰은 최대 1시간이다.
  - 파일 도구는 두 번 검사한다.
  - DB는 정적 SQL 검사와 읽기 전용 트랜잭션을 거친다.
- `barun-order.mdx`의 수치 "업체 고객 관리 조회의 쿼리 수 (고객 N명) 4N+3 → 7"
- `mzcube.mdx`의 "홈 화면 API 호출 (통합 API로 교체) 4개 → 1개"와 "## 접근" 둘째 항목(`/api/home/data`, 2025-09-30, 서버에서 병렬 실행)
- `nogada-rpg.mdx`의 "## 접근" 둘째 항목(읽은 판본이 그대로일 때만 저장, 어긋나면 처음부터 다시, 최대 3번 시도)

바른오더의 "고객 5명이면 23 → 7"은 검증된 식 `4N+3`에 N=5를 넣은 계산이다. 도면에는 "고객 5명일 때"라고 계산 조건을 적는다.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/e2e/deck.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('2장 가로 구간(데스크톱, 움직임 켬)', () => {
  test('장면이 고정되고 건너뛰기가 구간 뒤로 옮긴다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('.deck')).toHaveAttribute('data-pinned', '');
    await expect(page.locator('.pin-spacer .deck')).toHaveCount(1);
    await page.evaluate(() => document.querySelector('.deck')?.scrollIntoView());
    await page.waitForTimeout(300);
    await page.locator('[data-deck-skip]').click();
    await expect
      .poll(() => page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(await page.evaluate(() => window.innerHeight));
  });
});

test.describe('2장 가로 구간(모바일)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('고정 없이 세로로 쌓이고 건너뛰기는 숨는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('[data-deck-skip]')).toBeHidden();
  });
});

test.describe('2장 도면(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('슬라이드 4개가 도면·상태·근거와 함께 보인다', async ({ page }) => {
    await page.goto('/');
    const slides = page.locator('#agent-product .deck__slide');
    await expect(slides).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const svg = slides.nth(i).locator('svg.dg[role="img"]');
      await expect(svg).toHaveCount(1);
      await expect(svg.locator('title')).not.toHaveText('');
      expect(await slides.nth(i).locator('.evidence').count()).toBeGreaterThan(0);
    }
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/deck.spec.ts`
Expected: FAIL(`.deck`가 없다).

- [ ] **Step 4: 도면 공통 스타일과 도면 4개**

`src/styles/diagram.css`:

```css
/* 2장 도면 공통 스타일. 색은 토큰만 쓴다. */
.dg {
  display: block;
  width: 100%;
  height: auto;
  font-family: var(--font-mono);
}
.dg-line {
  fill: none;
  stroke: var(--blue);
  stroke-width: 2;
}
.dg-line--bad {
  stroke: var(--bad-line);
}
.dg-line--ok {
  stroke: var(--ok-line);
}
.dg-head {
  fill: var(--blue);
}
.dg-node rect {
  fill: var(--surface);
  stroke: var(--text);
  stroke-width: 1.2;
}
.dg-node--accent rect {
  stroke: var(--blue);
}
.dg-title {
  font-size: 13px;
  font-weight: 600;
  fill: var(--text);
}
.dg-sub {
  font-size: 10.5px;
  fill: var(--text-3);
}
.dg-label {
  font-size: 10.5px;
  fill: var(--text-2);
}
.dg-block {
  fill: var(--surface);
  stroke: var(--text);
  stroke-width: 1;
}
.dg-block--fixed {
  fill: var(--text-3);
  stroke: var(--text-3);
}
.dg-block--after {
  fill: var(--ok-bg);
  stroke: var(--ok-line);
}
```

`src/components/diagrams/AsahiDiagram.astro`:

```astro
<svg class="dg" viewBox="0 0 480 300" role="img" aria-labelledby="dg-asahi-t dg-asahi-d">
  <title id="dg-asahi-t">asahi의 권한 구조</title>
  <desc id="dg-asahi-d">디스코드 메시지는 봇이 받고, 파일·셸 작업은 토큰 하나만 가진 워커가 허브에 아웃바운드로 접속해 대신 실행합니다. 봇은 워커 토큰을 sha256 해시로만 저장하고, GitHub 작업에는 최대 1시간짜리 App 토큰을 발급합니다.</desc>
  <path class="dg-line" data-draw d="M126 52 H176" />
  <path class="dg-line" data-draw d="M250 86 V142" />
  <path class="dg-line" data-draw d="M250 232 V186" />
  <path class="dg-line" data-draw d="M324 52 H372 V254 H324" />
  <g class="dg-node" data-pop><rect x="16" y="30" width="110" height="44" rx="6" /><text class="dg-title" x="34" y="57">디스코드</text></g>
  <g class="dg-node dg-node--accent" data-pop>
    <rect x="176" y="22" width="148" height="64" rx="6" /><text class="dg-title" x="238" y="48">봇</text>
    <text class="dg-sub" x="186" y="70">디스코드·DB·모델 자격증명</text>
  </g>
  <g class="dg-node" data-pop><rect x="176" y="142" width="148" height="44" rx="6" /><text class="dg-title" x="196" y="169">WebSocket 허브</text></g>
  <g class="dg-node dg-node--accent" data-pop>
    <rect x="176" y="232" width="148" height="56" rx="6" /><text class="dg-title" x="232" y="256">워커</text>
    <text class="dg-sub" x="190" y="276">토큰 하나 · 파일·셸 실행</text>
  </g>
  <text class="dg-label" data-fade x="132" y="44">메시지</text>
  <text class="dg-label" data-fade x="258" y="120">봇이 연다</text>
  <text class="dg-label" data-fade x="258" y="214">아웃바운드 접속</text>
  <text class="dg-label" data-fade x="258" y="226">(sha256 해시로 대조)</text>
  <text class="dg-label" data-fade x="380" y="140">GitHub App</text>
  <text class="dg-label" data-fade x="380" y="154">토큰(최대 1시간)</text>
  <text class="dg-sub" data-fade x="16" y="120">파일 도구: 허용 폴더와</text>
  <text class="dg-sub" data-fade x="16" y="134">작업 폴더, 두 번 검사</text>
  <text class="dg-sub" data-fade x="16" y="162">DB: 정적 SQL 검사 +</text>
  <text class="dg-sub" data-fade x="16" y="176">읽기 전용 트랜잭션</text>
</svg>
```

`src/components/diagrams/BarunDiagram.astro`:

```astro
---
const N = 5;
const size = 12;
const gap = 4;
// 이전: 고정 3개 + 고객마다 4개(4N+3). 이후: 고정 2개 + 한 번에 5개(7).
const before = [
  ...Array.from({ length: 3 }, (_, i) => ({ x: 20 + i * (size + gap), y: 70, fixed: true })),
  ...Array.from({ length: N * 4 }, (_, i) => ({ x: 20 + (i % 4) * (size + gap), y: 94 + Math.floor(i / 4) * (size + gap), fixed: false })),
];
const after = [
  ...Array.from({ length: 2 }, (_, i) => ({ x: 290 + i * (size + gap), y: 70, fixed: true })),
  ...Array.from({ length: 5 }, (_, i) => ({ x: 290 + i * (size + gap), y: 94, fixed: false })),
];
---
<svg class="dg" viewBox="0 0 480 300" role="img" aria-labelledby="dg-barun-t dg-barun-d">
  <title id="dg-barun-t">바른오더 고객 관리 조회의 쿼리 수</title>
  <desc id="dg-barun-d">고정 쿼리 3개와 고객마다 4개씩 나가던 조회(4N+3)를 고정 2개와 한 번에 가져오는 5개, 모두 7개로 줄였습니다. 고객이 5명이면 23개에서 7개입니다.</desc>
  <text class="dg-title" x="20" y="40">이전 · 4N+3</text>
  <text class="dg-sub" x="20" y="56">고정 3 + 고객마다 4</text>
  {before.map((b) => <rect class:list={['dg-block', b.fixed && 'dg-block--fixed']} data-pop x={b.x} y={b.y} width={size} height={size} />)}
  <text class="dg-title" data-fade x="290" y="40">이후 · 7</text>
  <text class="dg-sub" data-fade x="290" y="56">고정 2 + 한 번에 5</text>
  {after.map((b) => <rect class:list={['dg-block', b.fixed ? 'dg-block--fixed' : 'dg-block--after']} data-pop x={b.x} y={b.y} width={size} height={size} />)}
  <path class="dg-line" data-draw d="M110 160 H270" />
  <path class="dg-head" data-fade d="M270 154 L282 160 L270 166 Z" />
  <text class="dg-label" data-fade x="20" y="270">고객 5명일 때 23개 → 7개 (커밋 f586b65)</text>
</svg>
```

`src/components/diagrams/MzcubeDiagram.astro`:

```astro
<svg class="dg" viewBox="0 0 480 300" role="img" aria-labelledby="dg-mzcube-t dg-mzcube-d">
  <title id="dg-mzcube-t">맛집큐브 홈 화면의 API 호출</title>
  <desc id="dg-mzcube-d">홈 화면이 따로 받던 API 4개(배너, 카테고리, 맛집 목록 2번)를 통합 API /api/home/data 하나로 묶었고, 서버는 응답을 만들 때 Supabase 쿼리를 병렬로 실행합니다.</desc>
  <text class="dg-title" x="16" y="30">이전 · 요청 4개</text>
  <g class="dg-node" data-pop><rect x="16" y="120" width="76" height="40" rx="6" /><text class="dg-title" x="28" y="145">홈 화면</text></g>
  <path class="dg-line" data-draw d="M92 132 L140 58" />
  <path class="dg-line" data-draw d="M92 136 L140 108" />
  <path class="dg-line" data-draw d="M92 144 L140 172" />
  <path class="dg-line" data-draw d="M92 148 L140 222" />
  <g class="dg-node" data-pop><rect x="140" y="42" width="80" height="30" rx="6" /><text class="dg-sub" x="150" y="61">배너</text></g>
  <g class="dg-node" data-pop><rect x="140" y="92" width="80" height="30" rx="6" /><text class="dg-sub" x="150" y="111">카테고리</text></g>
  <g class="dg-node" data-pop><rect x="140" y="156" width="80" height="30" rx="6" /><text class="dg-sub" x="150" y="175">맛집 목록</text></g>
  <g class="dg-node" data-pop><rect x="140" y="206" width="80" height="30" rx="6" /><text class="dg-sub" x="150" y="225">맛집 목록</text></g>
  <text class="dg-title" data-fade x="262" y="30">이후 · 요청 1개</text>
  <g class="dg-node" data-pop><rect x="262" y="120" width="76" height="40" rx="6" /><text class="dg-title" x="274" y="145">홈 화면</text></g>
  <path class="dg-line dg-line--ok" data-draw d="M338 140 H372" />
  <g class="dg-node dg-node--accent" data-pop><rect x="372" y="112" width="96" height="56" rx="6" /><text class="dg-sub" x="380" y="134">/api/home/data</text><text class="dg-sub" x="380" y="154">쿼리 병렬 실행</text></g>
  <text class="dg-label" data-fade x="262" y="270">통합 API로 교체 (커밋 5b130a1, 2025-09-30)</text>
</svg>
```

`src/components/diagrams/NogadaDiagram.astro`:

```astro
<svg class="dg" viewBox="0 0 480 300" role="img" aria-labelledby="dg-nogada-t dg-nogada-d">
  <title id="dg-nogada-t">nogada의 동시 갱신 유실 방지</title>
  <desc id="dg-nogada-d">같은 캐릭터에 요청이 동시에 들어오면, 읽은 판본이 그대로일 때만 저장하고 어긋나면 처음부터 다시 읽어 최대 3번 시도합니다. 모든 판정은 서버가 합니다.</desc>
  <g class="dg-node" data-pop><rect x="20" y="110" width="110" height="48" rx="6" /><text class="dg-title" x="34" y="132">읽기</text><text class="dg-sub" x="34" y="148">판본 v</text></g>
  <g class="dg-node" data-pop><rect x="185" y="110" width="110" height="48" rx="6" /><text class="dg-title" x="199" y="138">서버 판정</text></g>
  <g class="dg-node dg-node--accent" data-pop><rect x="350" y="110" width="110" height="48" rx="6" /><text class="dg-title" x="364" y="132">저장</text><text class="dg-sub" x="364" y="148">판본이 v일 때만</text></g>
  <path class="dg-line" data-draw d="M130 134 H185" />
  <path class="dg-line" data-draw d="M295 134 H350" />
  <path class="dg-line dg-line--bad" data-draw d="M405 158 V222 H75 V158" />
  <path class="dg-line dg-line--ok" data-draw d="M405 110 V60" />
  <text class="dg-label" data-fade x="140" y="244">판본이 바뀌었으면 처음부터 다시 · 최대 3번 시도</text>
  <text class="dg-label" data-fade x="414" y="56">저장됨</text>
</svg>
```

`src/components/diagrams/Diagram.astro`:

```astro
---
import '../../styles/diagram.css';
import AsahiDiagram from './AsahiDiagram.astro';
import BarunDiagram from './BarunDiagram.astro';
import MzcubeDiagram from './MzcubeDiagram.astro';
import NogadaDiagram from './NogadaDiagram.astro';

interface Props {
  id: string;
}

const DIAGRAMS = {
  asahi: AsahiDiagram,
  'barun-order': BarunDiagram,
  mzcube: MzcubeDiagram,
  'nogada-rpg': NogadaDiagram,
} as const;

const Component = DIAGRAMS[Astro.props.id as keyof typeof DIAGRAMS];
---
{Component && <Component />}
```

- [ ] **Step 5: 가로 구간 마크업**

`src/components/scenes/BuildDeck.astro`:

```astro
---
import type { ProjectEntry } from '../../lib/site';
import { deploymentStatus } from '../../lib/status';
import Diagram from '../diagrams/Diagram.astro';
import Evidence from '../Evidence.astro';
import Status from '../Status.astro';

interface Props {
  projects: ProjectEntry[];
}

const { projects } = Astro.props;
---
<div class="deck" data-scene="deck">
  <button type="button" class="deck__skip mono" data-deck-skip>건너뛰기 ↓</button>
  <div class="deck__viewport">
    <ol class="deck__track">
      {
        projects.map((p, i) => {
          const deploy = deploymentStatus(p.data.deployment);
          return (
            <li class="deck__slide" data-project={p.id}>
              <div class="deck__text">
                <p class="deck__num mono" data-reveal>2-{i + 1}</p>
                <h3 class="deck__title" data-reveal>
                  <a href={`/projects/${p.id}/`} data-detail-link>{p.data.title}</a>
                </h3>
                {deploy && (
                  <p data-reveal>
                    <Status view={deploy} />
                  </p>
                )}
                <p class="deck__tagline" data-reveal>{p.data.tagline}</p>
                <ul class="deck__metrics" data-reveal>
                  {p.data.metrics.slice(0, 2).map((m) => (
                    <li class="deck__metric">
                      <span class="deck__metric-label">{m.label}</span>
                      <strong class="mono">{m.value}</strong>
                      <Evidence evidence={m.evidence} />
                    </li>
                  ))}
                </ul>
              </div>
              <figure class="deck__figure panel">
                <Diagram id={p.id} />
              </figure>
            </li>
          );
        })
      }
    </ol>
  </div>
</div>

<style>
  .deck {
    position: relative;
  }
  .deck__skip {
    display: none;
    position: absolute;
    top: var(--sp-4);
    right: var(--sp-6);
    z-index: 2;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-3);
    font-size: var(--fs-mono);
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-sm);
    cursor: pointer;
  }
  .deck[data-pinned] .deck__skip {
    display: inline-flex;
  }
  .deck__viewport {
    overflow: hidden;
  }
  .deck__track {
    display: flex;
    flex-direction: column;
    gap: var(--sp-12);
    max-width: var(--w-wide);
    margin-inline: auto;
    padding-inline: var(--sp-6);
  }
  .deck__slide {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: var(--sp-8);
    align-items: center;
  }
  .deck__text {
    display: grid;
    gap: var(--sp-3);
  }
  .deck__num {
    font-size: var(--fs-mono);
    color: var(--blue);
  }
  .deck__title {
    font-size: var(--fs-h2);
    font-weight: 800;
    line-height: 1.3;
  }
  .deck__title a {
    color: var(--text);
  }
  .deck__tagline {
    color: var(--text-2);
  }
  .deck__metrics {
    display: grid;
    gap: var(--sp-2);
  }
  .deck__metric {
    display: grid;
    gap: var(--sp-1);
    font-size: var(--fs-small);
  }
  .deck__metric-label {
    color: var(--text-2);
  }
  .deck__figure {
    padding: var(--sp-4);
  }
  /* full 모드: 한 화면에 한 장씩 가로로 넘긴다 */
  .deck[data-pinned] .deck__viewport {
    height: calc(100vh - var(--topbar-h));
    display: flex;
    align-items: center;
  }
  .deck[data-pinned] .deck__track {
    flex-direction: row;
    gap: 0;
    width: max-content;
    max-width: none;
    margin-inline: 0;
    padding-inline: 0;
  }
  .deck[data-pinned] .deck__slide {
    width: 100vw;
    padding-inline: max(var(--sp-6), calc((100vw - var(--w-wide)) / 2 + var(--sp-6)));
  }
  @media (max-width: 767px) {
    .deck__track {
      padding-inline: var(--sp-4);
    }
    .deck__slide {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-4);
    }
  }
</style>
```

- [ ] **Step 6: 가로 구간 연출**

`src/motion/scenes/deck.ts`:

```ts
import { gsap } from '../gsap';
import { topbarOffset } from '../layout';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

function drawDiagram(slide: HTMLElement): gsap.core.Timeline {
  const pop = slide.querySelectorAll('[data-pop]');
  const draw = slide.querySelectorAll('[data-draw]');
  const fade = slide.querySelectorAll('[data-fade]');
  return gsap
    .timeline()
    .fromTo(pop, { autoAlpha: 0, scale: 0.6, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, stagger: 0.03, ease: EASE.back })
    .fromTo(draw, { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.12, duration: DURATION.slow }, 0.1)
    .fromTo(fade, { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.04 }, '>-0.3');
}

registerScene('deck', (root, { mode }) => {
  if (mode === 'static') return;
  const slides = Array.from(root.querySelectorAll<HTMLElement>('.deck__slide'));
  const texts = slides.map((s) => Array.from(s.querySelectorAll<HTMLElement>('[data-reveal]')));
  claim(...texts.flat());

  if (mode === 'lite') {
    const tls = slides.map((slide, i) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: slide, start: 'top 75%', once: true } });
      tl.fromTo(texts[i], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.06 }).add(drawDiagram(slide), 0.2);
      return tl;
    });
    return () => {
      for (const tl of tls) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }

  // full: 고정하고 가로로 넘긴다. 슬라이드는 기울며 들어오고 나간다(설계 §4.4 강조).
  const viewport = root.querySelector<HTMLElement>('.deck__viewport');
  const track = root.querySelector<HTMLElement>('.deck__track');
  const skip = root.querySelector<HTMLButtonElement>('[data-deck-skip]');
  if (!viewport || !track) return;
  root.dataset.pinned = '';
  const distance = () => track.scrollWidth - viewport.clientWidth;

  const move = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      pin: true,
      scrub: 0.8,
      start: () => `top ${topbarOffset()}px`,
      end: () => `+=${distance()}`,
      invalidateOnRefresh: true,
    },
  });

  const parts = slides.flatMap((slide, i) => {
    const show = gsap.timeline({
      scrollTrigger: { trigger: slide, containerAnimation: move, start: 'left 70%', once: true },
    });
    show.fromTo(texts[i], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.06 }).add(drawDiagram(slide), 0.2);
    const tilts: gsap.core.Tween[] = [];
    if (i > 0) {
      tilts.push(
        gsap.fromTo(slide, { rotation: 5, yPercent: 4 }, {
          rotation: 0,
          yPercent: 0,
          ease: 'none',
          scrollTrigger: { trigger: slide, containerAnimation: move, start: 'left right', end: 'left 40%', scrub: true },
        }),
      );
    }
    if (i < slides.length - 1) {
      tilts.push(
        gsap.to(slide, {
          rotation: -5,
          autoAlpha: 0.35,
          ease: 'none',
          scrollTrigger: { trigger: slide, containerAnimation: move, start: 'right 60%', end: 'right left', scrub: true },
        }),
      );
    }
    return [show, ...tilts];
  });

  const onSkip = () => {
    const st = move.scrollTrigger;
    if (st) window.scrollTo({ top: st.end + 2 });
  };
  skip?.addEventListener('click', onSkip);

  return () => {
    skip?.removeEventListener('click', onSkip);
    for (const p of parts) {
      p.scrollTrigger?.kill();
      p.kill();
    }
    move.scrollTrigger?.kill();
    move.kill();
    delete root.dataset.pinned;
  };
});
```

`src/motion/scenes/index.ts`에 `import './deck';`을 추가한다.

`src/pages/index.astro`:
- `import BuildDeck from '../components/scenes/BuildDeck.astro';`를 추가한다.
- `#agent-product` 섹션을 다음으로 바꾼다. 이 섹션에는 `container`를 붙이지 않는다. 가로 구간은 화면 폭 전체를 쓴다.

```astro
  <section id="agent-product" aria-labelledby="agent-product-title">
    <div class="container container--wide">
      <ChapterCard id="agent-product" num="2장" title="만들고 운영한다" lead="AI 에이전트와 제품" />
    </div>
    <BuildDeck projects={site.agentProduct} />
  </section>
```

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors. style-rules는 도면 SVG 안에 hex 색이 없음(클래스로만 칠함)을 확인한다.

Run: `npm run test:e2e -- tests/e2e/deck.spec.ts tests/e2e/content.spec.ts tests/e2e/layout.spec.ts tests/e2e/motion.spec.ts tests/e2e/home.spec.ts`
Expected: 모두 PASS.
- `content.spec.ts`의 `#agent-product [data-project]` 순서와 "서버 중지" 검사가 통과한다.
- `layout.spec.ts`의 390·834·1280px 가로 넘침 검사가 통과한다. 가로 트랙은 `.deck__viewport`의 `overflow: hidden` 안에 있다.
- `motion.spec.ts`의 "끝까지 스크롤하면 모두 보인다"가 고정 구간을 지나서도 통과한다.

- [ ] **Step 8: 커밋**

```bash
git add src/styles/diagram.css src/components/diagrams src/components/scenes/BuildDeck.astro src/motion/scenes src/pages/index.astro tests/e2e/deck.spec.ts
git commit -m "feat: 2장 가로 구간 — 기울며 넘어가는 슬라이드와 스스로 그려지는 도면 4개" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 경력 타임라인과 일하는 방식 흐름도

**Files:**
- Modify: `src/components/Timeline.astro` (레일·진행선·등장 표시)
- Create: `src/motion/scenes/timeline.ts`
- Create: `src/components/scenes/HowIWork.astro`, `src/motion/scenes/how.ts`
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro` (`#how-i-work`)
- Test: `tests/e2e/story.spec.ts` (생성)

**Interfaces:**
- Consumes: `TimelineItem`(`src/lib/timeline.ts`), `Profile['howIWork']`, `SectionHeader`, `claim`, `registerScene`, `diagram.css`(Task 8)
- Produces:
  - `Timeline.astro`: 같은 Props `{ items: TimelineItem[] }`로 `div.timeline[data-scene="timeline"]`를 그린다.
    - 그 안에 `.timeline__rail`, `.timeline__progress`, `ol.timeline__list > li.timeline__item[data-reveal]`가 있다.
    - `h3` 제목은 v1과 같다. `composites.test.ts`는 그대로 통과한다.
  - `HowIWork.astro`: Props `{ profile: Profile }`. `section#how-i-work[data-scene="how"]`를 그린다.
    - 흐름도 `svg.dg[role="img"]`
    - 원칙 카드 `.principle`
    - 근거 링크 목록 `.evidence-list`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/e2e/story.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profile } from '../../src/data/profile';

test.describe('경력·일하는 방식(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('타임라인 항목과 흐름도, 원칙, 근거 링크가 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#experience .timeline__item')).toHaveCount(4);
    const flow = page.locator('#how-i-work svg.dg[role="img"]');
    await expect(flow).toHaveCount(1);
    for (const step of ['설계 문서', '구현 계획', '테스트 먼저', '구현', '측정·검증']) {
      await expect(flow).toContainText(step);
    }
    await expect(page.locator('#how-i-work .principle')).toHaveCount(profile.howIWork.principles.length);
    await expect(page.locator('#how-i-work .evidence-list a[target="_blank"]')).toHaveCount(profile.howIWork.evidence.length);
  });
});

test.describe('경력 타임라인(움직임 켬)', () => {
  test('스크롤하면 진행선이 끝까지 그려진다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#experience').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await expect
      .poll(() => page.locator('.timeline__progress').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d), { timeout: 5000 })
      .toBeGreaterThan(0.95);
  });
});
```

타임라인 항목 수 4는 이루리랩스·세미콜론·병역·학력이다. `buildTimeline(profile)`의 길이와 같다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/story.spec.ts`
Expected: FAIL(흐름도와 `.timeline__progress`가 없다).

- [ ] **Step 3: 타임라인**

`src/components/Timeline.astro`를 다음으로 교체:

```astro
---
import type { TimelineItem } from '../lib/timeline';

interface Props {
  items: TimelineItem[];
}

const { items } = Astro.props;
---
<div class="timeline" data-scene="timeline">
  <span class="timeline__rail" aria-hidden="true"></span>
  <span class="timeline__progress" aria-hidden="true"></span>
  <ol class="timeline__list">
    {
      items.map((it) => (
        <li class="timeline__item" data-reveal>
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
</div>

<style>
  .timeline {
    position: relative;
    padding-left: var(--sp-6);
  }
  .timeline__rail,
  .timeline__progress {
    position: absolute;
    left: 3px;
    top: 0;
    bottom: 0;
    width: 1px;
  }
  .timeline__rail {
    background: var(--line-strong);
  }
  .timeline__progress {
    width: 2px;
    left: 2.5px;
    background: var(--blue);
    transform-origin: 50% 0;
    transform: scaleY(0);
  }
  :global(html:not(.motion)) .timeline__progress {
    transform: scaleY(1);
  }
  .timeline__item {
    position: relative;
    padding-bottom: var(--sp-8);
  }
  .timeline__item:last-child {
    padding-bottom: 0;
  }
  .timeline__item::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--sp-6));
    top: 7px;
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
    font-size: var(--fs-h3);
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

`src/motion/scenes/timeline.ts`:

```ts
import { gsap } from '../gsap';
import { registerScene } from '../registry';

registerScene('timeline', (root, { mode }) => {
  if (mode === 'static') return;
  const progress = root.querySelector<HTMLElement>('.timeline__progress');
  if (!progress) return;
  const tween = gsap.fromTo(
    progress,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger:
        mode === 'full'
          ? { trigger: root, start: 'top 70%', end: 'bottom 60%', scrub: 0.5 }
          : { trigger: root, start: 'top 80%', once: true },
    },
  );
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
});
```

항목은 기본 등장(`revealRemaining`)이 한 줄씩 올린다. 이 장면은 진행선만 맡는다.

- [ ] **Step 4: 일하는 방식**

`src/components/scenes/HowIWork.astro`:

```astro
---
import '../../styles/diagram.css';
import type { Profile } from '../../lib/schema';
import SectionHeader from '../SectionHeader.astro';

interface Props {
  profile: Profile;
}

const { profile } = Astro.props;
// 원칙 2·3의 흐름(설계 문서와 구현 계획을 먼저, 테스트를 먼저, 측정으로 확인)을 그린다.
const STEPS = ['설계 문서', '구현 계획', '테스트 먼저', '구현', '측정·검증'];
const W = 118;
const GAP = 22;
---
<section id="how-i-work" class="container container--wide" aria-labelledby="how-i-work-title" data-scene="how">
  <SectionHeader id="how-i-work" title="일하는 방식" />
  <figure class="how__flow panel">
    <svg class="dg" viewBox={`0 0 ${STEPS.length * W + (STEPS.length - 1) * GAP + 20} 90`} role="img" aria-labelledby="dg-how-t">
      <title id="dg-how-t">설계 문서 → 구현 계획 → 테스트 먼저 → 구현 → 측정·검증</title>
      {
        STEPS.map((step, i) => (
          <g class:list={['dg-node', i === STEPS.length - 1 && 'dg-node--accent']} data-pop>
            <rect x={10 + i * (W + GAP)} y="22" width={W} height="44" rx="6" />
            <text class="dg-title" x={10 + i * (W + GAP) + 14} y="49">{step}</text>
          </g>
        ))
      }
      {
        STEPS.slice(1).map((_, i) => (
          <path class="dg-line" data-draw d={`M${10 + (i + 1) * W + i * GAP} 44 H${10 + (i + 1) * (W + GAP)}`} />
        ))
      }
    </svg>
  </figure>
  <ul class="how__principles">
    {
      profile.howIWork.principles.map((p) => (
        <li class="surface principle" data-reveal>
          <h3 class="principle__title">{p.title}</h3>
          <p class="principle__body">{p.body}</p>
        </li>
      ))
    }
  </ul>
  <ul class="evidence-list mono" data-reveal>
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

<style>
  .how__flow {
    padding: var(--sp-4);
    overflow-x: auto;
  }
  .how__flow .dg {
    min-width: 560px;
  }
  .how__principles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-3);
    margin-top: var(--sp-6);
  }
  .principle__title {
    font-size: var(--fs-body);
    font-weight: 700;
    margin-bottom: var(--sp-1);
  }
  .principle__body {
    font-size: var(--fs-small);
    color: var(--text-2);
  }
  .evidence-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2) var(--sp-4);
    margin-top: var(--sp-4);
    font-size: var(--fs-mono);
  }
  @media (max-width: 1023px) {
    .how__principles {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
```

`src/motion/scenes/how.ts`:

```ts
import { gsap } from '../gsap';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('how', (root, { mode }) => {
  if (mode === 'static') return;
  const pop = root.querySelectorAll('.how__flow [data-pop]');
  const draw = root.querySelectorAll('.how__flow [data-draw]');
  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 70%', once: true } });
  tl.fromTo(pop, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.15, ease: EASE.out }).fromTo(
    draw,
    { drawSVG: '0%' },
    { drawSVG: '100%', stagger: 0.15, duration: DURATION.base },
    0.15,
  );
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
});
```

`src/motion/scenes/index.ts`에 `import './timeline';`과 `import './how';`를 추가한다.

`src/pages/index.astro`:
- `import HowIWork from '../components/scenes/HowIWork.astro';`를 추가한다.
- `<section id="how-i-work" ...>…</section>`을 `<HowIWork profile={profile} />`로 바꾼다.
- `#experience` 섹션의 여는 태그를 `<section id="experience" class="container" aria-labelledby="experience-title">`로 둔다(Task 4에서 이미 `container`).
- `<style>`에서 `.principle__title`, `.principle__body`, `.evidence-list` 규칙을 지운다.

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors. `composites.test.ts`의 Timeline 테스트(`<h3 …>이루리랩스</h3>`)가 통과한다.

Run: `npm run test:e2e -- tests/e2e/story.spec.ts tests/e2e/home.spec.ts tests/e2e/layout.spec.ts tests/e2e/motion.spec.ts`
Expected: 모두 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/Timeline.astro src/components/scenes/HowIWork.astro src/motion/scenes src/pages/index.astro tests/e2e/story.spec.ts
git commit -m "feat: 그려지는 경력 타임라인과 일하는 방식 흐름도" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 그 밖의 프로젝트·기술 스택·마무리와 카드 기울기

**Files:**
- Create: `src/motion/tilt.ts`
- Create: `src/components/scenes/More.astro`, `src/components/scenes/Skills.astro`, `src/components/scenes/Closing.astro`
- Create: `src/motion/scenes/more.ts`
- Modify: `src/components/ProjectCard.astro` (`data-tilt`)
- Modify: `src/motion/scenes/index.ts`, `src/pages/index.astro` (전체 교체)
- Test: `tests/e2e/closing.spec.ts` (생성)

**Interfaces:**
- Consumes:
  - `ProjectCard`, `ProjectLine`, `projectHref`
  - `Site`(`src/lib/site.ts`), `Button`, `SectionHeader`
  - `gsap`, `registerScene`, `DURATION`, `EASE`
- Produces:
  - `tilt.ts`: `enableTilt(root: ParentNode): () => void`. `[data-tilt]` 요소가 마우스 위치에 따라 최대 약 10° 기운다.
  - `More.astro`: Props `{ site: Site }`, `section#more[data-scene="more"]`
  - `Skills.astro`: Props `{ site: Site }`, `section#skills`
  - `Closing.astro`: Props `{ profile: Profile; pdfName: string }`, `section#contact`
  - 홈 섹션 순서: intro, highlights, ml, agent-product, experience, how-i-work, more, skills, contact

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/e2e/closing.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('마무리: 큰 마무리 문장과 이메일·GitHub·PDF가 있다', async ({ page }) => {
  await page.goto('/');
  const closing = page.locator('#contact');
  await expect(closing.locator('.closing__line')).toHaveText('끝까지 봐 주셔서 감사합니다.');
  await expect(closing.locator('a[href="mailto:nunconnect1@gmail.com"]').first()).toBeVisible();
  await expect(closing.locator('a[href="https://github.com/wwoosshh"]').first()).toBeVisible();
  await expect(closing.locator('a[href="/portfolio.pdf"]')).toHaveAttribute('download', '우성현_포트폴리오.pdf');
});

test.describe('카드 기울기(움직임 켬)', () => {
  test('마우스를 올리면 기울고 벗어나면 돌아온다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const card = page.locator('#more [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await card.boundingBox();
    if (!box) throw new Error('카드가 보이지 않습니다');
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
    await page.mouse.move(0, 0);
    await expect
      .poll(() => card.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.abs(m.m13) + Math.abs(m.m23); }), { timeout: 3000 })
      .toBeLessThan(0.01);
  });
});

test.describe('카드 기울기(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('마우스를 올려도 기울지 않는다', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#more [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(500);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:e2e -- tests/e2e/closing.spec.ts`
Expected: FAIL(`.closing__line`과 `[data-tilt]`가 없다).

- [ ] **Step 3: 기울기 유틸과 장면**

`src/motion/tilt.ts`:

```ts
import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** [data-tilt] 카드가 마우스 위치를 따라 기운다(설계 §4.4 강조, full 모드 전용). */
export function enableTilt(root: ParentNode): () => void {
  const offs = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]')).map((card) => {
    gsap.set(card, { transformPerspective: 800 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: DURATION.base, ease: EASE.out });
    const ry = gsap.quickTo(card, 'rotationY', { duration: DURATION.base, ease: EASE.out });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      ry(((e.clientX - r.left) / r.width - 0.5) * 12);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    return () => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
      gsap.set(card, { clearProps: 'transform' });
    };
  });
  return () => {
    for (const off of offs) off();
  };
}
```

`src/motion/scenes/more.ts`:

```ts
import { registerScene } from '../registry';
import { enableTilt } from '../tilt';

registerScene('more', (root, { mode }) => {
  if (mode !== 'full') return;
  return enableTilt(root);
});
```

`src/motion/scenes/index.ts`에 `import './more';`를 추가한다.

`src/components/ProjectCard.astro`의 여는 태그 `<article class="card surface surface--interactive" data-project={project.id}>`를 `<article class="card surface surface--interactive" data-project={project.id} data-tilt data-reveal>`로 바꾼다. 그리고 `<style>`의 `.card` 규칙에 `will-change: transform;`을 추가한다.

- [ ] **Step 4: 세 장면 마크업**

`src/components/scenes/More.astro`:

```astro
---
import type { Site } from '../../lib/site';
import ProjectCard from '../ProjectCard.astro';
import ProjectLine from '../ProjectLine.astro';
import SectionHeader from '../SectionHeader.astro';

interface Props {
  site: Site;
}

const { site } = Astro.props;
---
<section id="more" class="container container--wide" aria-labelledby="more-title" data-scene="more">
  <SectionHeader id="more" title="그 밖의 프로젝트" />
  <div class="more__cards">{site.cards.map((p) => <ProjectCard project={p} />)}</div>
  {site.lines.length > 0 && <ul class="more__lines" data-reveal>{site.lines.map((p) => <ProjectLine project={p} />)}</ul>}
</section>

<style>
  .more__cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--sp-3);
    perspective: 1000px;
  }
  .more__lines {
    margin-top: var(--sp-6);
    border-top: 1px solid var(--line);
  }
  @media (max-width: 1023px) {
    .more__cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 767px) {
    .more__cards {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
```

`src/components/scenes/Skills.astro`:

```astro
---
import { projectHref } from '../../lib/links';
import type { Site } from '../../lib/site';
import SectionHeader from '../SectionHeader.astro';

interface Props {
  site: Site;
}

const { site } = Astro.props;
const { profile } = site;
---
<section id="skills" class="container container--wide" aria-labelledby="skills-title">
  <SectionHeader id="skills" title="기술 스택" note="프로젝트로 증명된 것만" />
  <dl class="skills">
    {
      profile.skills.map((group) => (
        <div class="skills__group" data-reveal>
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
                          class="skill__chip"
                          href={target.href}
                          target={target.external ? '_blank' : undefined}
                          rel={target.external ? 'noopener noreferrer' : undefined}
                        >
                          {p.data.title}
                          {target.external && <span aria-hidden="true"> ↗</span>}
                        </a>
                      ) : (
                        <span class="skill__chip">{p.data.title}</span>
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

<style>
  .skills {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-6) var(--sp-8);
  }
  .skills__group dt {
    font-weight: 700;
    margin-bottom: var(--sp-2);
  }
  .skill {
    display: grid;
    grid-template-columns: 13rem minmax(0, 1fr);
    align-items: baseline;
    gap: var(--sp-3);
    padding-block: var(--sp-2);
    border-bottom: 1px solid var(--line);
    font-size: var(--fs-small);
  }
  .skill__projects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1) var(--sp-2);
  }
  .skill__chip {
    padding: 0 var(--sp-2);
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    transition:
      background-color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out);
  }
  .skill:hover .skill__chip {
    background: var(--mark);
    border-color: var(--line-strong);
  }
  @media (max-width: 1023px) {
    .skills {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 767px) {
    .skill {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sp-1);
    }
  }
</style>
```

`src/components/scenes/Closing.astro`:

```astro
---
import type { Profile } from '../../lib/schema';
import Button from '../Button.astro';

interface Props {
  profile: Profile;
  pdfName: string;
}

const { profile, pdfName } = Astro.props;
---
<section id="contact" class="closing container container--wide" aria-labelledby="contact-title">
  <p class="closing__line" data-reveal>끝까지 봐 주셔서 감사합니다.</p>
  <h2 id="contact-title" class="closing__title mono" data-reveal>연락처</h2>
  <ul class="closing__contact" data-reveal>
    {
      profile.contact.email && (
        <li>
          <span class="closing__label mono">이메일</span>{' '}
          <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
        </li>
      )
    }
    <li>
      <span class="closing__label mono">GitHub</span>{' '}
      <a href={profile.contact.github} target="_blank" rel="noopener noreferrer">
        {profile.contact.github.replace('https://', '')} <span aria-hidden="true">↗</span>
      </a>
    </li>
  </ul>
  <div class="closing__actions" data-reveal>
    <Button href={profile.contact.github} label="GitHub" external />
    {profile.contact.email && <Button href={`mailto:${profile.contact.email}`} label="이메일" />}
    <Button href="/portfolio.pdf" label="PDF" download={pdfName} />
  </div>
</section>

<style>
  .closing {
    display: grid;
    gap: var(--sp-4);
    padding-block: var(--sp-16);
    min-height: 60vh;
    align-content: center;
  }
  .closing__line {
    font-size: var(--fs-chapter);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
  }
  .closing__title {
    font-size: var(--fs-mono);
    font-weight: 400;
    color: var(--text-3);
  }
  .closing__contact {
    display: grid;
    gap: var(--sp-2);
  }
  .closing__contact li {
    display: flex;
    align-items: baseline;
    gap: var(--sp-3);
  }
  .closing__label {
    width: 5rem;
    font-size: var(--fs-mono);
    color: var(--text-3);
  }
  .closing__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
  }
</style>
```

- [ ] **Step 5: 홈 페이지 조립**

`src/pages/index.astro`를 다음으로 교체한다. 이전 작업의 장면을 모두 조립하고, 남은 v1 스타일을 없앤다.

```astro
---
import SectionHeader from '../components/SectionHeader.astro';
import Timeline from '../components/Timeline.astro';
import BuildDeck from '../components/scenes/BuildDeck.astro';
import ChapterCard from '../components/scenes/ChapterCard.astro';
import Closing from '../components/scenes/Closing.astro';
import Hero from '../components/scenes/Hero.astro';
import Highlights from '../components/scenes/Highlights.astro';
import HowIWork from '../components/scenes/HowIWork.astro';
import More from '../components/scenes/More.astro';
import ProjectScene from '../components/scenes/ProjectScene.astro';
import Skills from '../components/scenes/Skills.astro';
import Base from '../layouts/Base.astro';
import { loadSite } from '../lib/site';
import { buildTimeline } from '../lib/timeline';

const site = await loadSite();
const { profile } = site;
const title = `${profile.name} · ${profile.headline.mark} ${profile.headline.rest}`;
const pdfName = `${profile.name}_포트폴리오.pdf`;
---
<Base title={title} description={profile.intro[0]} bare>
  <Hero profile={profile} pdfName={pdfName} />
  <Highlights profile={profile} />
  <section id="ml" class="container container--wide" aria-labelledby="ml-title">
    <ChapterCard id="ml" num="1장" title="정확성" lead="AI/ML 시스템과 컴파일러" />
    {site.ml.map((p, i) => <ProjectScene project={p} num={`1-${i + 1}`} />)}
  </section>
  <section id="agent-product" aria-labelledby="agent-product-title">
    <div class="container container--wide">
      <ChapterCard id="agent-product" num="2장" title="만들고 운영한다" lead="AI 에이전트와 제품" />
    </div>
    <BuildDeck projects={site.agentProduct} />
  </section>
  <section id="experience" class="container" aria-labelledby="experience-title">
    <SectionHeader id="experience" title="경력 · 활동" />
    <Timeline items={buildTimeline(profile)} />
  </section>
  <HowIWork profile={profile} />
  <More site={site} />
  <Skills site={site} />
  <Closing profile={profile} pdfName={pdfName} />
</Base>

<style>
  :global(main) > section + section {
    margin-top: var(--sp-16);
  }
  @media (max-width: 767px) {
    :global(main) > section + section {
      margin-top: var(--sp-12);
    }
  }
</style>
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run && npx astro check`
Expected: PASS, 0 errors.

Run: `npm run test:e2e`
Expected: 전체 PASS. 확인할 점:
- 홈 섹션 순서(`home.spec.ts`)가 v1과 같다.
- 기술 스택 연결(`content.spec.ts`의 `#skills .skill`, `.skill__projects a`)이 통과한다.
- 한 줄 항목의 역할 표기가 통과한다.
- 새 탭 링크의 ↗ 검사가 통과한다.

- [ ] **Step 7: 커밋**

```bash
git add src/motion/tilt.ts src/motion/scenes src/components/ProjectCard.astro src/components/scenes/More.astro src/components/scenes/Skills.astro src/components/scenes/Closing.astro src/pages/index.astro tests/e2e/closing.spec.ts
git commit -m "feat: 기울어지는 프로젝트 카드, 기술 스택 강조, 발표의 마지막 장 같은 마무리" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 품질 게이트, 공개 PDF, README

**Files:**
- Create: `tests/e2e/perf.spec.ts`
- Modify: `README.md` (디자인 규칙 절)
- Modify: `public/portfolio.pdf` (다시 만들기)

**Interfaces:**
- Consumes: 완성된 홈(Task 1~10), `dist/`
- Produces:
  - 성능 예산 테스트
  - CLS 테스트
  - 새 색으로 다시 만든 공개 PDF
  - 개정된 README

- [ ] **Step 1: 성능 테스트 작성**

`tests/e2e/perf.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const DIST = path.resolve('dist');

// index.html의 모듈 스크립트에서 시작해 정적·동적 import를 모두 따라간다.
function homeScripts(): string[] {
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const queue = [...html.matchAll(/<script[^>]*\ssrc="(\/_astro\/[^"]+\.js)"/g)].map((m) => path.join(DIST, m[1]));
  const seen = new Set<string>();
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      queue.push(path.resolve(path.dirname(file), m[1]));
    }
  }
  return [...seen];
}

test('홈의 자바스크립트 합계는 gzip 기준 100KB 이하다', () => {
  const files = homeScripts();
  expect(files.length).toBeGreaterThan(0);
  const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0);
  console.log(`홈 JS: ${files.length}개, gzip ${(total / 1024).toFixed(1)}KB`);
  expect(total).toBeLessThanOrEqual(100 * 1024);
});

test('끝까지 스크롤하는 동안 레이아웃 흔들림(CLS)이 0.05 미만이다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
  await page.evaluate(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(800);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  console.log(`CLS: ${cls.toFixed(4)}`);
  expect(cls).toBeLessThan(0.05);
});
```

- [ ] **Step 2: 실행**

Run: `npm run test:e2e -- tests/e2e/perf.spec.ts`
Expected: PASS. 로그에 홈 JS 크기와 CLS가 찍힌다.

예산을 넘으면 먼저 `src/motion/gsap.ts`가 필요한 플러그인만 가져오는지 확인한다. 그래도 넘으면 멈추고 크기 내역을 보고한다. CLS가 0.05 이상이면 흔들린 요소를 찾는다(`PerformanceObserver` 항목의 `sources`). transform이 아닌 속성을 움직였거나 크기가 없는 요소가 늦게 채워진 곳을 고치고 보고한다.

- [ ] **Step 3: README 디자인 규칙 절 개정**

`README.md`의 "## 디자인 규칙" 절을 다음으로 바꾼다.

```markdown
## 디자인 규칙

- 바탕은 종이색이고, 다이어그램·시연 장면에만 모눈 패널(`.panel`)을 씁니다. 그림자는 쓰지 않습니다.
- 색은 `src/styles/tokens.css`에서만 정의합니다. 글씨 색은 바탕·표면·패널 모두에서 대비 4.5:1 이상입니다(`src/lib/contrast.test.ts`).
- 모서리는 `var(--r-sm)`, `var(--r-md)`와 원형 점(타임라인 점)에 쓰는 `50%`만 씁니다.
- 움직임은 GSAP으로 얹습니다(`src/motion/`). CSS의 `transition`·`animation`은 움직임 토큰(`--dur-*`, `--ease-*`)만 씁니다.
- 큰 동작(3D 전환, 튕김, 흔들림, 기울기)은 장 전환·핵심 성과 숫자·불일치 순간·2장 슬라이드·프로젝트 카드에서만 씁니다.
- 움직임을 줄이도록 설정한 사용자와 자바스크립트가 없는 경우에도 모든 내용이 보입니다. 인쇄와 PDF에는 움직임이 없습니다.
- 위 규칙은 `src/lib/style-rules.test.ts`, `tests/e2e/design.spec.ts`, `tests/e2e/motion.spec.ts`가 검사합니다.
```

- [ ] **Step 4: 공개 PDF 다시 만들기**

Run: `npm run pdf`
Expected: `저장: …\public\portfolio.pdf (N장)`에서 N ≤ 4.

그다음 공개 PDF에 전화번호 형식 문자열이 없는지 확인한다. 이 도구는 Xpdf라서 `-enc UTF-8`이 필요하다.

Run: `pdftotext -enc UTF-8 -layout public/portfolio.pdf - | grep -cE "01[016789][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}"`
Expected: `0`

Run: `pdftotext -enc UTF-8 -layout public/portfolio.pdf - | grep -oE "[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+" | sort -u`
Expected: `nunconnect1@gmail.com`만 나온다.

`pdf:private`는 실행하지 않는다.

- [ ] **Step 5: 전체 검사(CI 순서)와 눈으로 확인**

Run: `npm ci && npm test && npm run build && npx playwright test && npm run check:links`
Expected:
- 모두 성공한다.
- `npm ci`는 lockfile을 바꾸지 않는다.
- 외부 링크는 모두 200이다. 429는 경고만 한다.

미리보기(`npm run preview`)를 띄워 스크린샷을 찍고 `.superpowers/sdd/` 작업 폴더에 저장한다(저장소 밖). 찍을 장면은 다음과 같다.
- 1280px:
  - 히어로 연출이 끝난 뒤
  - 핵심 성과
  - 1장 간지
  - 2장 가로 구간의 둘째 슬라이드
  - 경력
  - 마무리
- 390px: 히어로, 2장
- 움직임 줄임: 1280px 히어로

찍은 뒤 미리보기 서버와 남은 `astro preview` 프로세스를 멈춘다.

- [ ] **Step 6: 커밋**

```bash
git add tests/e2e/perf.spec.ts README.md public/portfolio.pdf
git commit -m "test: 성능 예산·CLS 검사, 새 디자인 규칙 README, 공개 PDF 갱신" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 1 완료 후

- 이 계획이 끝나면 PR로 올려 Linux CI를 거친다. 이후 사용자 승인으로 병합하면 Vercel이 배포한다.
- 제출용 PDF는 컨트롤러가 병합 뒤 `npm run pdf:private`로 다시 만든다. 이 파일은 저장소 밖에 둔다.
- 계획 2(대표작 시연 4개)는 `ProjectScene.astro`의 `.pscene__panel` 자리에 시연을 넣고, 1장 장면을 고정(pin)형으로 바꾼다.
