import { describe, expect, test } from 'vitest';
import { formatCount, parseCount } from './count';

describe('parseCount', () => {
  test('정수 하나', () => {
    expect(parseCount('81')).toEqual({ prefix: '', target: 81, suffix: '', grouped: false });
  });
  test('앞의 수만 세고 나머지는 그대로 둔다', () => {
    expect(parseCount('194/194')).toEqual({ prefix: '', target: 194, suffix: '/194', grouped: false });
  });
  test('앞 글자와 천 단위 쉼표', () => {
    expect(parseCount('약 21,000')).toEqual({ prefix: '약 ', target: 21000, suffix: '', grouped: true });
  });
  test('숫자가 없으면 null', () => {
    expect(parseCount('리뷰 대기')).toBeNull();
  });
});

describe('formatCount', () => {
  test('쉼표가 있던 수는 쉼표를 붙인다', () => {
    const parts = parseCount('약 21,000');
    expect(parts && formatCount(parts, 12345)).toBe('약 12,345');
  });
  test('뒤 글자를 유지한다', () => {
    const parts = parseCount('194/194');
    expect(parts && formatCount(parts, 97)).toBe('97/194');
  });
});
