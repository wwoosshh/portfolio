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
      group: 'oss',
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
