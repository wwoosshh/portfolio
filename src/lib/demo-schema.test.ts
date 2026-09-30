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
