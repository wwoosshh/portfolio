import { byRepo, engagementTally, shortRepo, tally } from '../lib/contribution-stats';
import { profileSchema } from '../lib/schema';
import { contributions } from './contributions';

// 기여 수치는 글에 적지 않고 데이터(매일 갱신)에서 계산한다.
const pt = tally(contributions.items.filter((c) => c.repo === 'pytorch/pytorch'));
const all = tally(contributions.items);
const repoNames = byRepo(contributions.items).map((g) => shortRepo(g.repo));
const { asahi } = contributions.own;
const { reviews: reviewed } = engagementTally(contributions.engagements);

export const profile = profileSchema.parse({
  name: '우성현',
  nameEn: 'Woo Sunghyeun',
  asOf: '2026-09-30',
  headline: { mark: '정확성을 검증하는', rest: 'AI/ML 시스템 엔지니어' },
  intro: [
    `한국어 시스템 언어의 컴파일러를 만들었고, PyTorch 컴파일러와 LLM 추론 엔진이 오류 없이 틀린 값을 내는 지점을 찾아 보고하고 고칩니다. PyTorch 기여자로 수정 ${pt.merged}건이 병합되었습니다.`,
    'AI 코딩 에이전트와 함께 빠르게 만들되, 결과는 믿기 전에 측정하고 검증합니다.',
  ],
  contact: {
    email: 'nunconnect1@gmail.com',
    github: 'https://github.com/wwoosshh',
    site: 'https://portfolio-nu-taupe-66.vercel.app',
  },
  highlights: [
    {
      label: `PyTorch 기여자 · 병합 ${pt.merged}건`,
      detail: `torch.compile에서 찾은 버그를 이슈 ${pt.issues}건으로 보고하고 수정 PR ${pt.prs}건을 냈습니다. 병합 ${pt.merged}건, 열린 PR ${pt.openPrs}건.`,
      status: 'ok',
      statusText: `merged ${pt.merged}`,
      evidence: 'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh',
      figure: { value: String(pt.merged), unit: '건 병합' },
    },
    {
      label: `오픈소스 ${all.repos}곳에 기여`,
      detail: `${repoNames.join('·')}에 이슈 ${all.issues}건, PR ${all.prs}건을 올렸습니다.${reviewed > 0 ? ` 다른 개발자의 PR ${reviewed}건을 리뷰했습니다.` : ''}`,
      status: 'ok',
      statusText: `issues ${all.issues} · PRs ${all.prs}`,
      evidence: 'https://github.com/search?q=author%3Awwoosshh+-user%3Awwoosshh+-org%3Asemicollon-club&type=issues',
      figure: { value: String(all.repos), unit: '개 프로젝트' },
    },
    {
      label: '자체 컴파일러 자체 호스팅',
      detail: '글 언어의 컴파일러가 두 세대 모두 자기 자신을 컴파일하는 고정점에 도달했습니다. 2세대 수용 테스트 194/194.',
      status: 'ok',
      statusText: 'self-hosted',
      evidence: 'https://github.com/wwoosshh/geul-lang/commit/e566d18',
      figure: { value: '194/194', unit: '통과' },
    },
    {
      label: 'AI 개발 에이전트 운영',
      detail: `동아리에서 실제로 쓰는 디스코드 AI 개발 에이전트 asahi의 개발을 이끌고 운영합니다. main 브랜치에 병합된 PR ${asahi.mergedPrs}건.`,
      status: 'ok',
      statusText: `${asahi.mergedPrs} PRs merged`,
      evidence: asahi.url,
      figure: { value: String(asahi.mergedPrs), unit: '건 병합' },
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
        '동아리 AI 개발 에이전트 asahi와 홈페이지 semicollon.com의 개발을 이끌고 운영합니다.',
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
        title: 'AI와 함께 만들고, 판단은 직접',
        body: 'Claude Code 같은 AI 코딩 에이전트와 협업합니다. 무엇을 만들지와 어떤 결과를 받아들일지는 제가 판단하고, 구현과 문서 작업은 AI와 함께 합니다. 공동 작업 사실은 숨기지 않고 밝힙니다(커밋의 공동 작성 표기, 프로젝트별 역할 표기와 AI 협업 방식).',
      },
      {
        title: '설계 문서 → 계획 → 테스트 먼저',
        body: '큰 작업은 설계 문서와 구현 계획을 먼저 쓰고, 테스트를 먼저 작성한 뒤 구현합니다. 중요한 결정은 ADR로 남깁니다.',
      },
      {
        title: '믿기 전에 측정한다',
        body: '성능과 정확성에 대한 주장은 측정으로 확인하고, 가설이 틀리면 틀렸다고 기록합니다. 이 사이트의 프로젝트 핵심 수치에는 모두 근거를 달았습니다. 공개 저장소는 링크로, 비공개 저장소는 면접에서 화면으로 보여 드립니다.',
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
        url: 'https://github.com/wwoosshh/inversa-bench/blob/6f100b7b2f449e0298eb3ee34f781a96c4281a24/README.md?plain=1#L16',
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
        { name: 'GitHub Actions', projects: ['entail', 'geul-lang', 'nogada-rpg'] },
        { name: '자가 호스팅 배포 (미니PC)', projects: ['nogada-rpg', 'asahi'] },
        { name: 'Vercel · Railway · Supabase', projects: ['barun-order', 'mzcube'] },
      ],
    },
  ],
});
