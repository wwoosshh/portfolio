import { describe, expect, test } from 'vitest';
import { BREAKPOINT, MEDIA, motionMode } from './mode';

describe('motionMode', () => {
  test('움직임 줄임이면 폭과 상관없이 static', () => {
    expect(motionMode({ reducedMotion: true, width: 1440 })).toBe('static');
    expect(motionMode({ reducedMotion: true, width: 390 })).toBe('static');
  });
  test('768px 이상이면 full, 미만이면 lite', () => {
    expect(motionMode({ reducedMotion: false, width: BREAKPOINT })).toBe('full');
    expect(motionMode({ reducedMotion: false, width: BREAKPOINT - 1 })).toBe('lite');
  });
  test('미디어 쿼리는 서로 겹치지 않게 경계를 나눈다', () => {
    expect(MEDIA.full).toContain('(min-width: 768px)');
    expect(MEDIA.lite).toContain('(max-width: 767px)');
    expect(MEDIA.static).toBe('(prefers-reduced-motion: reduce)');
    expect(MEDIA.full).toContain('no-preference');
    expect(MEDIA.lite).toContain('no-preference');
  });
});
