import { describe, expect, test } from 'vitest';
import { formatDate, formatPeriod, formatYearMonth, shortRef } from './format';

describe('기간·날짜', () => {
  test('연-월을 점으로 표시한다', () => {
    expect(formatYearMonth('2026-09')).toBe('2026.09');
  });
  test('시작과 끝이 다르면 범위로 표시한다', () => {
    expect(formatPeriod({ start: '2026-01', end: '2026-03' })).toBe('2026.01 – 2026.03');
  });
  test('시작과 끝이 같으면 한 달로 표시한다', () => {
    expect(formatPeriod({ start: '2026-09', end: '2026-09' })).toBe('2026.09');
  });
  test('끝이 없으면 현재까지로 표시한다', () => {
    expect(formatPeriod({ start: '2026-07' })).toBe('2026.07 – 현재');
  });
  test('날짜는 YYYY-MM-DD로 표시한다', () => {
    expect(formatDate(new Date('2026-09-29'))).toBe('2026-09-29');
  });
  // 갱신은 06:00 KST(21:00 UTC)에 돈다. UTC로 적으면 "마지막 변경"이 하루 전 날짜로 보인다.
  test('날짜는 한국 시간(Asia/Seoul) 기준이다', () => {
    expect(formatDate(new Date('2026-10-06T21:00:00Z'))).toBe('2026-10-07');
    expect(formatDate(new Date('2026-10-06T14:59:59Z'))).toBe('2026-10-06');
    expect(formatDate(new Date('2026-10-06T15:00:00Z'))).toBe('2026-10-07');
    expect(formatDate(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01');
  });
  test('날짜만 적힌 값(UTC 자정)은 한국 시간에서도 같은 날이다', () => {
    expect(formatDate(new Date('2026-09-30'))).toBe('2026-09-30');
    expect(formatDate(new Date('2026-01-01'))).toBe('2026-01-01');
  });
});

describe('shortRef', () => {
  test.each([
    ['https://github.com/vllm-project/vllm/issues/58675', 'vllm#58675'],
    ['https://github.com/pytorch/pytorch/pull/198096', 'pytorch#198096'],
    ['https://github.com/wwoosshh/clearly-backend/commit/f586b65', 'clearly-backend@f586b65'],
    ['https://github.com/wwoosshh/geul-lang/actions', 'geul-lang CI'],
    ['https://github.com/wwoosshh/Entail/blob/main/README.md?plain=1#L104-L108', 'Entail/README.md'],
    ['https://github.com/semicollon-club/asahi/tree/main/docs/decisions', 'asahi/docs/decisions'],
    ['https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh', 'pytorch 이슈 목록'],
    ['https://github.com/semicollon-club/asahi/pulls?q=is%3Apr+is%3Amerged', 'asahi PR 목록'],
    ['https://github.com/wwoosshh/foodiemap-website/deployments', 'foodiemap-website 배포 기록'],
    [
      'https://api.github.com/repos/wwoosshh/foodiemap-website/deployments?environment=Production&per_page=100',
      'foodiemap-website 배포 기록',
    ],
    ['https://github.com/wwoosshh/Entail', 'wwoosshh/Entail'],
    ['https://github.com/wwoosshh', 'wwoosshh'],
    [
      'https://github.com/wwoosshh/geul-lang/blob/v2/%EC%99%84%EC%84%B1-%EA%B8%B0%EB%A1%9D-2026-09-21.md?plain=1#L14',
      'geul-lang/완성-기록-2026-09-21.md',
    ],
    ['https://pypi.org/project/entail-ai/', 'pypi:entail-ai'],
    ['https://www.mzcube.com/', 'mzcube.com'],
  ])('%s → %s', (url, expected) => {
    expect(shortRef(url)).toBe(expected);
  });
});
