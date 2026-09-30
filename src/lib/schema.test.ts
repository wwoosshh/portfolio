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

  test('http(s)가 아닌 근거 URL은 실패한다', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      metrics: [{ label: 'x', value: '1', evidence: 'javascript:alert(1)' }],
    });
    expect(result.success).toBe(false);
  });

  test('알 수 없는 키(오타)가 있으면 실패한다', () => {
    const result = projectSchema.safeParse({ ...validProject, period: { start: '2026-09', ende: '2026-10' } });
    expect(result.success).toBe(false);
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
      figure: { value: String(n), unit: '건' },
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

  test('핵심 성과의 큰 숫자는 숫자 또는 숫자/숫자 형식이다', () => {
    const withFigure = (figure: { value: string; unit: string }) => ({
      ...validProfile,
      highlights: validProfile.highlights.map((h) => ({ ...h, figure })),
    });
    const accepts = (value: string, unit = '건') => profileSchema.safeParse(withFigure({ value, unit })).success;
    // 형식이 아닌 값: 한글, 단위가 붙은 값
    expect(accepts('여섯'), '여섯').toBe(false);
    expect(accepts('6건'), '6건').toBe(false);
    // 단위는 비어 있을 수 없다
    expect(accepts('6', ''), '빈 단위').toBe(false);
    // 천 단위 쉼표와 분수 형식은 통과한다
    expect(accepts('1,000'), '1,000').toBe(true);
    expect(accepts('3/4'), '3/4').toBe(true);
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

  test('연락처에 정의되지 않은 키가 있으면 실패한다', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      contact: { ...validProfile.contact, phone: 'x' },
    });
    expect(result.success).toBe(false);
  });
});
