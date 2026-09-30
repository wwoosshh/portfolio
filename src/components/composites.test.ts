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

const bareCard = {
  id: 'monney',
  data: projectSchema.parse({
    title: 'monney',
    tagline: '가상 거래소',
    tier: 'card',
    track: 'other',
    order: 22,
    period: { start: '2026-09' },
    role: '1인 개발',
    stack: ['Python'],
    repo: { visibility: 'public', url: 'https://github.com/wwoosshh/monney' },
    deployment: { state: 'none' },
    asOf: '2026-09-29',
    aiCollab: 'AI 협업',
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
  test('대표 수치의 라벨과 값을 근거 링크 바로 위에 보여 준다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: featured } });
    const metric = html.match(/<p class="card__metric"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
    expect(metric).toContain('GSM8K');
    expect(metric).toContain('379 → 273 / 500');
    expect(metric).toMatch(/GSM8K<\/span> <strong/);
    expect(html.indexOf('class="card__metric"')).toBeLessThan(html.indexOf('class="card__foot"'));
  });
  test('수치가 없는 카드는 수치 줄도 근거 줄도 그리지 않는다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: bareCard } });
    expect(html).toContain('data-project="monney"');
    expect(html).not.toContain('card__metric');
    expect(html).not.toContain('card__foot');
  });
});

describe('ProjectLine', () => {
  const line = {
    id: 'gitspace',
    data: projectSchema.parse({
      title: 'GitSpace',
      tagline: 'git 이력을 3D 우주로 보여 주는 데스크톱 뷰어',
      tier: 'line',
      track: 'other',
      order: 31,
      period: { start: '2026-07', end: '2026-07' },
      role: '1인 개발 · AI 코딩 에이전트 협업',
      stack: ['Rust'],
      repo: { visibility: 'public', url: 'https://github.com/wwoosshh/GitSpace' },
      deployment: { state: 'none' },
      asOf: '2026-09-29',
      aiCollab: 'AI 협업',
    }),
  };
  test('한 줄 항목은 기간과 외부 링크를 보여 준다', async () => {
    const html = await container.renderToString(ProjectLine, { props: { project: line } });
    expect(html).toContain('data-project="gitspace"');
    expect(html).toContain('2026.07');
    expect(html).toContain('href="https://github.com/wwoosshh/GitSpace"');
  });
  test('한 줄 항목은 태그라인 뒤에 역할(AI 협업 표기)을 보여 준다', async () => {
    const html = await container.renderToString(ProjectLine, { props: { project: line } });
    const role = html.match(/<span class="line__role"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '';
    expect(role).toContain('1인 개발 · AI 코딩 에이전트 협업');
    expect(html.indexOf('line__tagline')).toBeLessThan(html.indexOf('line__role'));
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
