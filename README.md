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
| `npm run check:links` | 빌드 결과의 외부 링크 검사 (먼저 `npm run build`) |

처음 한 번은 `npx playwright install chromium`이 필요합니다.

`pdf:private`는 저장소 밖 `../private/contact.json`이 있어야 합니다. 형식은 `{"phone": "010-0000-0000"}`입니다(예시 값).

## 콘텐츠 수정

- 프로젝트: `src/content/projects/<id>.mdx`. 앞부분 데이터 형식은 `src/lib/schema.ts`를 따릅니다.
- 프로필·경력·기술 스택: `src/data/profile.ts`
- 외부 PR·이슈: `src/data/contributions.ts`
- 프로젝트 핵심 수치(`metrics`)와 홈 핵심 성과(`highlights`)에는 근거 URL이 필요합니다. 없으면 빌드가 실패합니다. 비공개 저장소 프로젝트의 수치만 `{ private: true, note }`를 쓸 수 있습니다.
- 줄 번호가 붙은 GitHub 근거 링크는 커밋 SHA로 고정합니다(`src/lib/permalinks.test.ts`가 검사합니다).
- 서버가 꺼진 서비스는 `deployment.state: down`으로 둡니다. 시연 영상이 생기면 `deployment.video`에 URL을 넣습니다.
- 수치를 고치면 `asOf` 날짜도 고칩니다.

## 디자인 규칙

- 바탕은 종이색이고, 다이어그램·시연 장면에만 모눈 패널(`.panel`)을 씁니다. 그림자는 쓰지 않습니다.
- 색은 `src/styles/tokens.css`에서만 정의합니다. 글씨 색은 바탕·표면·패널 모두에서 대비 4.5:1 이상입니다(`src/lib/contrast.test.ts`).
- 모서리는 `var(--r-sm)`, `var(--r-md)`와 원형 점(타임라인 점)에 쓰는 `50%`만 씁니다.
- 움직임은 GSAP으로 얹습니다(`src/motion/`). CSS의 `transition`·`animation`은 움직임 토큰(`--dur-*`, `--ease-*`)만 씁니다.
- 큰 동작(3D 전환, 튕김, 흔들림, 기울기)은 장 전환·핵심 성과 숫자·불일치 순간·2장 슬라이드·프로젝트 카드에서만 씁니다.
- 움직임을 줄이도록 설정한 사용자와 자바스크립트가 없는 경우에도 모든 내용이 보입니다. 인쇄와 PDF에는 움직임이 없습니다.
- 위 규칙은 `src/lib/style-rules.test.ts`, `tests/e2e/design.spec.ts`, `tests/e2e/motion.spec.ts`가 검사합니다.

## 배포 (Vercel)

GitHub 저장소를 Vercel에 가져오면 Astro가 자동으로 인식됩니다. Build Command는 `npm run build`, Output Directory는 `dist`, Node.js는 22.x입니다. `main`에 푸시하면 자동으로 배포됩니다.

## 설계 문서

- 설계: `docs/superpowers/specs/2026-09-29-portfolio-design.md`
- 구현 계획: `docs/superpowers/plans/2026-09-29-portfolio-site.md`
