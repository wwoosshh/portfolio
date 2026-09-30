import { expect, test } from 'vitest';
import { contributions } from './contributions';
import { profile } from './profile';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

test('공개 데이터에 전화번호 형식 문자열이 없다', () => {
  expect(JSON.stringify(profile)).not.toMatch(PHONE);
  expect(JSON.stringify(contributions)).not.toMatch(PHONE);
});

test('공개 연락처는 업무용 이메일과 GitHub뿐이다', () => {
  expect(profile.contact.email).toBe('nunconnect1@gmail.com');
  expect(profile.contact.github).toBe('https://github.com/wwoosshh');
});

test('핵심 성과는 3~4개이고 모두 https 근거가 있다', () => {
  expect(profile.highlights.length).toBeGreaterThanOrEqual(3);
  expect(profile.highlights.length).toBeLessThanOrEqual(4);
  for (const h of profile.highlights) expect(h.evidence.startsWith('https://')).toBe(true);
});

test('실무 경력은 글로만 공개한다', () => {
  for (const e of profile.experience) expect(e.disclosure).toBe('text-only');
});
