import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { CURVE, DURATION, curvePath } from './tokens';

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');
const value = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} 없음`);
  return m[1].trim();
};

describe('움직임 토큰은 CSS와 TS가 같다', () => {
  test.each([
    ['dur-fast', DURATION.fast],
    ['dur-base', DURATION.base],
    ['dur-slow', DURATION.slow],
  ] as const)('%s', (name, seconds) => {
    expect(value(name)).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  test.each([
    ['ease-out', CURVE.out],
    ['ease-in-out', CURVE.inOut],
    ['ease-back', CURVE.back],
  ] as const)('%s', (name, curve) => {
    expect(value(name)).toBe(`cubic-bezier(${curve.join(', ')})`);
  });

  test('곡선 경로는 CustomEase가 읽는 SVG 경로다', () => {
    expect(curvePath(CURVE.out)).toBe('M0,0 C0.2,0.8 0.2,1 1,1');
  });
});
