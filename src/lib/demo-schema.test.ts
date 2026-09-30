import { describe, expect, test } from 'vitest';
import { hero } from '../data/hero';
import { heroSchema, provenanceSchema, sourceSchema } from './demo-schema';

const SHA = 'afcfac2376eeaa03f822ea5ea0d09e897f092ef8';
const FILE = `https://github.com/wwoosshh/AI-accelerator-compiler/blob/${SHA}/fuzz/README.md?plain=1`;
// sha·줄 표기·url이 서로 맞는 출처. 각 규칙 시험은 여기서 한 가지만 어긋나게 한다.
const source = { url: `${FILE}#L4-L5`, sha: SHA, lines: 'L4-L5' };

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
  test('확인 날짜는 달력에 있는 날짜여야 한다', () => {
    for (const verifiedAt of ['2026-99-99', '2026-02-30', '2026-02-29']) {
      expect(provenanceSchema.safeParse({ ...provenance, verifiedAt }).success, verifiedAt).toBe(false);
    }
    expect(provenanceSchema.safeParse({ ...provenance, verifiedAt: '2024-02-29' }).success).toBe(true); // 윤일
  });
});

describe('sourceSchema', () => {
  test('sha·줄 표기·url이 맞으면 통과한다', () => {
    expect(sourceSchema.safeParse(source).success).toBe(true);
    expect(sourceSchema.safeParse({ ...source, url: `${FILE}#L10`, lines: 'L10' }).success).toBe(true);
    expect(sourceSchema.safeParse({ url: 'https://github.com/pytorch/pytorch/issues/198094' }).success).toBe(true);
  });
  test('줄 표기의 시작은 1 이상이어야 한다', () => {
    for (const lines of ['L0', 'L0-L3']) {
      expect(sourceSchema.safeParse({ ...source, url: `${FILE}#${lines}`, lines }).success, lines).toBe(false);
    }
  });
  test('줄 표기의 끝은 시작보다 앞설 수 없다', () => {
    expect(sourceSchema.safeParse({ ...source, url: `${FILE}#L12-L10`, lines: 'L12-L10' }).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, url: `${FILE}#L10-L10`, lines: 'L10-L10' }).success).toBe(true);
  });
  test('sha가 있으면 url에 그 sha가 들어 있어야 한다', () => {
    expect(sourceSchema.safeParse({ ...source, sha: '0'.repeat(40) }).success).toBe(false); // 다른 커밋
    expect(sourceSchema.safeParse({ ...source, url: `${FILE.replace(SHA, 'main')}#L4-L5` }).success).toBe(false); // 브랜치 이름
  });
  test('줄 표기가 있으면 url의 #조각과 같아야 한다', () => {
    expect(sourceSchema.safeParse({ ...source, url: FILE }).success).toBe(false); // 조각 없음
    expect(sourceSchema.safeParse({ ...source, url: `${FILE}#L4-L6` }).success).toBe(false); // 다른 범위
    expect(sourceSchema.safeParse({ ...source, url: `${FILE}#L10-L12`, lines: 'L1' }).success).toBe(false); // 앞부분만 같음
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

describe('히어로 실제 데이터(src/data/hero.ts)', () => {
  test('강화한 스키마를 통과한다', () => {
    expect(heroSchema.safeParse(hero).success).toBe(true);
  });
  test('GitHub 파일 링크 출처는 모두 커밋에 고정돼 있다', () => {
    const files = hero.provenance.sources.filter((s) => s.url.includes('/blob/'));
    expect(files.length).toBeGreaterThan(0);
    for (const s of files) expect(s.sha, s.url).toMatch(/^[0-9a-f]{40}$/);
  });
});
