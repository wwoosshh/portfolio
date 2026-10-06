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

## 홈 구성

히어로와 핵심 성과 다음에 두 장이 이어집니다.

1. **오픈소스**(`#oss`): 외부 프로젝트에 낸 이슈·PR의 상태를 저장소별로 보여 주는 기여 보드와, 직접 운영하는 오픈소스 대표작.
2. **개인 프로젝트**(`#personal`): 대표작을 가로 데크로 한 장씩 보여 줍니다.

그 뒤에 경력, 일하는 방식, 그 밖의 프로젝트, 기술 스택, 마무리가 이어집니다. 대표작이 어느 장에 놓이는지는 MDX 앞부분의 `group`(`oss` 또는 `personal`)이 정하고, 인쇄본(`/print/`, PDF)도 오픈소스, 개인 프로젝트 순서입니다.

## 콘텐츠 수정

- 프로젝트: `src/content/projects/<id>.mdx`. 앞부분 데이터 형식은 `src/lib/schema.ts`를 따릅니다. 대표작(`tier: featured`)은 `group`(`oss` 또는 `personal`)이 필요합니다.
- 프로필·경력·기술 스택: `src/data/profile.ts`
- 외부 PR·이슈와 내 오픈소스 수치: `src/data/contributions.json`. 매일 자동으로 갱신됩니다(아래 "기여 데이터 자동 갱신").
- 상태가 바뀌는 수치(병합·리뷰 상태, 병합 PR 수, 릴리스 수)는 MDX에 적지 않습니다. `src/lib/live-metrics.ts`가 기여 데이터에서 계산하고, 홈·상세 페이지·인쇄본이 모두 그 값을 씁니다.
- 프로젝트 핵심 수치(`metrics`)와 홈 핵심 성과(`highlights`)에는 근거 URL이 필요합니다. 없으면 빌드가 실패합니다. 비공개 저장소 프로젝트의 수치만 `{ private: true, note }`를 쓸 수 있습니다.
- 줄 번호가 붙은 GitHub 근거 링크는 커밋 SHA로 고정합니다(`src/lib/permalinks.test.ts`가 검사합니다).
- 서버가 꺼진 서비스는 `deployment.state: down`으로 둡니다. 시연 영상이 생기면 `deployment.video`에 URL을 넣습니다.
- 수치를 고치면 `asOf` 날짜도 고칩니다.

## 디자인 규칙

- 바탕은 종이색이고, 다이어그램·시연 장면에만 모눈 패널(`.panel`)을 씁니다. 그림자는 쓰지 않습니다.
- 색은 `src/styles/tokens.css`에서만 정의합니다. 글씨 색은 바탕·표면·패널 모두에서 대비 4.5:1 이상입니다(`src/lib/contrast.test.ts`).
- 모서리는 `var(--r-sm)`, `var(--r-md)`와 원형 점(타임라인 점)에 쓰는 `50%`만 씁니다.
- 움직임은 GSAP으로 얹습니다(`src/motion/`). CSS의 `transition`·`animation`은 움직임 토큰(`--dur-*`, `--ease-*`)만 씁니다.
- 큰 동작(3D 전환, 튕김, 흔들림, 기울기, 도장 찍기)은 장 전환·핵심 성과 숫자·불일치 순간·기여 보드의 병합 칩·2장 슬라이드·프로젝트 카드에서만 씁니다.
- 움직임을 줄이도록 설정한 사용자와 자바스크립트가 없는 경우에도 모든 내용이 보입니다. 인쇄와 PDF에는 움직임이 없습니다.
- 위 규칙은 `src/lib/style-rules.test.ts`, `tests/e2e/design.spec.ts`, `tests/e2e/motion.spec.ts`가 검사합니다.

## 기여 데이터 자동 갱신

`src/data/contributions.json`은 GitHub Actions 워크플로 `refresh-contributions`(`.github/workflows/refresh-contributions.yml`)가 매일 06:00(KST)에 GitHub와 PyPI에서 읽어 갱신합니다.

- 스크립트(`scripts/refresh-contributions.ts`)는 데이터가 바뀐 경우에만 `main`에 커밋합니다. 바뀐 것이 없거나 읽기에 실패하면 커밋하지 않습니다. 커밋이 올라가면 Vercel이 다시 배포합니다.
- 사람이 관리하는 필드는 `project`(찾은 도구), `note`, `related`(다른 개발자의 수정 PR 번호), 최상위 `ignore`·`excludeOwners`뿐입니다. 제목·상태·날짜 같은 나머지는 스크립트가 덮어씁니다.
- 새로 올린 외부 이슈·PR은 작성자 검색으로 자동 추가됩니다. 이때 `project`는 `null`입니다. 검색은 공개 저장소(`is:public`)로 한정하므로, 개인 토큰으로 로컬에서 돌려도 비공개 저장소의 제목과 주소는 들어가지 않습니다.
- 라벨은 사이트가 쓰는 `Merged`·`triaged`만 저장합니다. 나머지 라벨이 바뀌어도 커밋은 생기지 않습니다.
- "마지막 변경" 같은 날짜는 한국 시간(KST)으로 적습니다.

로컬에서 한 번 돌릴 때는 아래처럼 합니다. 토큰은 환경 변수로만 넘기고, 화면에 찍거나 파일에 쓰지 않습니다.

```sh
GITHUB_TOKEN=$(gh auth token) node --experimental-strip-types scripts/refresh-contributions.ts
```

## 배포 (Vercel)

GitHub 저장소를 Vercel에 가져오면 Astro가 자동으로 인식됩니다. Build Command는 `npm run build`, Output Directory는 `dist`, Node.js는 22.x입니다. `main`에 푸시하면 자동으로 배포됩니다.

## 설계 문서

- 설계: `docs/superpowers/specs/2026-09-29-portfolio-design.md`
- 구현 계획: `docs/superpowers/plans/2026-09-29-portfolio-site.md`
- 오픈소스 기여 중심 구조 개편: `docs/superpowers/specs/2026-10-06-portfolio-oss-restructure-design.md`, `docs/superpowers/plans/2026-10-06-portfolio-oss-restructure-plan.md`
