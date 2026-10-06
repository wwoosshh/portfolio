import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, test } from 'vitest';
import { contributions } from '../data/contributions';
import { shortRef } from '../lib/format';
import { metricsOf } from '../lib/live-metrics';
import { contributionSchema, projectSchema } from '../lib/schema';
import ContributionList from './ContributionList.astro';
import MetricList from './MetricList.astro';
import ProjectCard from './ProjectCard.astro';
import ProjectLine from './ProjectLine.astro';
import ProjectScene from './scenes/ProjectScene.astro';
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
    group: 'oss',
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

// 기여 데이터에서 계산하는 수치가 없는 대표작(프런트매터의 수치만 쓴다)
const staticFeatured = { id: 'geul-lang', data: featured.data };

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
  test('계산한 수치가 없으면 기준일만 적는다', async () => {
    const html = await container.renderToString(MetricList, {
      props: { metrics: featured.data.metrics, asOf: featured.data.asOf },
    });
    expect(html).toMatch(/<p class="metrics__asof"[^>]*>2026-09-29 기준<\/p>/);
    expect(html).not.toContain('자동 갱신');
  });
  test('계산한 수치가 들어 있으면 그 수치가 매일 자동으로 바뀐다고 밝힌다', async () => {
    const html = await container.renderToString(MetricList, {
      props: { metrics: metricsOf(featured, contributions), asOf: featured.data.asOf, live: true },
    });
    expect(html).toMatch(/<p class="metrics__asof"[^>]*>2026-09-29 기준 · 기여·릴리스 수치는 매일 자동 갱신<\/p>/);
  });
});

describe('ProjectCard', () => {
  test('대표작은 상세 링크(data-detail-link)와 첫 근거, 스택 4개를 보여 준다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: staticFeatured } });
    expect(html).toContain('data-project="geul-lang"');
    expect(html).toMatch(/href="\/projects\/geul-lang\/"[^>]*data-detail-link/);
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
    const html = await container.renderToString(ProjectCard, { props: { project: staticFeatured } });
    const metric = html.match(/<p class="card__metric"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
    expect(metric).toContain('GSM8K');
    expect(metric).toContain('379 → 273 / 500');
    expect(metric).toMatch(/GSM8K<\/span> <strong/);
    expect(html.indexOf('class="card__metric"')).toBeLessThan(html.indexOf('class="card__foot"'));
  });
  // 건수는 매일 바뀌므로 기대값을 데이터에서 계산한 수치로 잡는다.
  test('기여 데이터에서 계산한 수치가 있어도 카드의 대표 수치는 프런트매터의 첫 수치(핵심 결과)다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: featured } });
    const lead = metricsOf(featured, contributions)[0];
    expect(lead).toBe(featured.data.metrics[0]);
    const metric = html.match(/<p class="card__metric"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';
    expect(metric).toContain('GSM8K');
    expect(metric).toContain('379 → 273 / 500');
    expect(metric).not.toContain('외부 이슈');
    expect(html).toContain(`근거 → ${shortRef(lead.evidence as string)}`);
  });
  test('수치가 없는 카드는 수치 줄도 근거 줄도 그리지 않는다', async () => {
    const html = await container.renderToString(ProjectCard, { props: { project: bareCard } });
    expect(html).toContain('data-project="monney"');
    expect(html).not.toContain('card__metric');
    expect(html).not.toContain('card__foot');
  });
});

describe('ProjectScene', () => {
  test('수치 패널의 기준일: 계산한 수치가 있는 프로젝트만 그 수치가 매일 자동으로 바뀐다고 밝힌다', async () => {
    const live = await container.renderToString(ProjectScene, { props: { project: featured, num: '1-1' } });
    expect(live).toMatch(/<p class="pscene__asof mono"[^>]*>2026-09-29 기준 · 기여·릴리스 수치는 매일 자동 갱신<\/p>/);
    const fixed = await container.renderToString(ProjectScene, { props: { project: staticFeatured, num: '1-4' } });
    expect(fixed).toMatch(/<p class="pscene__asof mono"[^>]*>2026-09-29 기준<\/p>/);
    expect(fixed).not.toContain('자동 갱신');
  });
  test('제목 요소는 기본이 h3이고, headingLevel로 h4가 된다', async () => {
    const byDefault = await container.renderToString(ProjectScene, { props: { project: featured, num: '1-1' } });
    expect(byDefault).toMatch(/<h3 class="pscene__title"/);
    expect(byDefault).not.toContain('<h4');
    const nested = await container.renderToString(ProjectScene, { props: { project: featured, num: '1-1', headingLevel: 4 } });
    expect(nested).toMatch(/<h4 class="pscene__title"[^>]*><a href="\/projects\/entail\/" data-detail-link/);
    expect(nested).not.toContain('<h3');
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
      createdAt: '2026-09-22T02:35:00Z',
    });
    const html = await container.renderToString(ContributionList, {
      props: { items: [item], asOf: new Date('2026-09-29') },
    });
    expect(html).toContain('분류됨');
    expect(html).toContain('pytorch#198094');
    expect(html).toContain('이슈');
  });

  test('링크 이름에 종류(PR·이슈)가 들어 있다', async () => {
    const base = {
      repo: 'pytorch/pytorch',
      title: 'title',
      state: 'open',
      project: null,
      createdAt: '2026-09-22T02:35:00Z',
    };
    const items = [
      contributionSchema.parse({ ...base, kind: 'issue', number: 1, url: 'https://github.com/pytorch/pytorch/issues/1' }),
      contributionSchema.parse({ ...base, kind: 'pr', number: 2, url: 'https://github.com/pytorch/pytorch/pull/2' }),
    ];
    const html = await container.renderToString(ContributionList, { props: { items, asOf: new Date('2026-10-06') } });
    expect(html).toMatch(/<a class="contrib__ref"[^>]*>\s*<span class="sr-only"[^>]*>이슈 <\/span>pytorch#1 /);
    expect(html).toMatch(/<a class="contrib__ref"[^>]*>\s*<span class="sr-only"[^>]*>PR <\/span>pytorch#2 /);
  });

  test('머리글은 매일 자동 확인과 마지막 변경 날짜를 알린다', async () => {
    const html = await container.renderToString(ContributionList, {
      props: { items: [], asOf: new Date('2026-10-06T02:34:21Z') },
    });
    expect(html).toContain('매일 자동 확인 · 마지막 변경 2026-10-06');
    expect(html).not.toContain('기준 · 외부 저장소');
  });

  test('다른 개발자의 수정 PR을 상태와 함께 항목 아래에 그린다', async () => {
    const item = contributionSchema.parse({
      repo: 'sgl-project/sglang',
      kind: 'issue',
      number: 41227,
      title: '[Bug] rope_theta dropped',
      state: 'open',
      url: 'https://github.com/sgl-project/sglang/issues/41227',
      project: 'entail',
      createdAt: '2026-09-23T05:00:00Z',
      related: [
        {
          repo: 'sgl-project/sglang',
          number: 41239,
          title: 'Fix rope_scaling override',
          state: 'closed',
          url: 'https://github.com/sgl-project/sglang/pull/41239',
          author: 'someone',
        },
        {
          repo: 'sgl-project/sglang',
          number: 41327,
          title: 'fix(rope)',
          state: 'open',
          url: 'https://github.com/sgl-project/sglang/pull/41327',
          author: 'another',
        },
      ],
    });
    const html = await container.renderToString(ContributionList, {
      props: { items: [item], asOf: new Date('2026-10-06') },
    });
    const related = html.match(/<ul class="contrib__related"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';
    expect(related.match(/<li/g)).toHaveLength(2);
    expect(related).toContain('다른 개발자의 수정 PR');
    expect(related).toMatch(/href="https:\/\/github\.com\/sgl-project\/sglang\/pull\/41239" target="_blank" rel="noopener noreferrer"/);
    expect(related).toContain('SGLang#41239');
    expect(related).toContain('↗');
    expect(related).toContain('닫힘');
    expect(related).toContain('리뷰 대기');
    // 글자와 링크, 링크와 상태 사이에 공백이 남는다.
    expect(related).toMatch(/다른 개발자의 수정 PR\s+<a /);
    expect(related).toMatch(/<\/a>\s+<span class="status/);
  });

  test('관련 PR이 없으면 목록을 그리지 않는다', async () => {
    const item = contributionSchema.parse({
      repo: 'pytorch/pytorch',
      kind: 'issue',
      number: 1,
      title: 'bug',
      state: 'open',
      url: 'https://github.com/pytorch/pytorch/issues/1',
      project: null,
      createdAt: '2026-09-22T02:35:00Z',
    });
    const html = await container.renderToString(ContributionList, { props: { items: [item], asOf: new Date('2026-10-06') } });
    expect(html).not.toContain('contrib__related');
  });
});
