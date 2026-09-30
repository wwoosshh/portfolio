import { describe, expect, test } from 'vitest';
import { countUp } from './effects';
import { gsap } from './gsap';

// 계약: 세는 동안이 아니면(시작 전·끝·중단·되돌림) el.textContent는 항상 원래 글자다.
const fakeEl = (textContent = '') => ({ textContent }) as unknown as HTMLElement;

function count(el: HTMLElement, text: string, duration = 1): gsap.core.Tween {
  const tween = countUp(el, text, duration);
  if (!tween) throw new Error(`countUp이 null을 돌려줌: ${text}`);
  return tween;
}

/** 장면처럼 gsap.context 안에서 만든다. 정리할 때 ctx.revert()가 이 트윈을 되돌린다. */
function countInContext(el: HTMLElement, text: string, duration = 1) {
  let made = null as gsap.core.Tween | null;
  const ctx = gsap.context(() => {
    made = countUp(el, text, duration);
  });
  if (!made) throw new Error(`countUp이 null을 돌려줌: ${text}`);
  return { ctx, tween: made };
}

/** 세는 도중의 글자: 0도 원래 글자도 아닌 중간 값이어야 한다. */
function expectMidCount(el: HTMLElement) {
  expect(el.textContent).toMatch(/^약 [\d,]+$/);
  expect(el.textContent).not.toBe('약 0');
  expect(el.textContent).not.toBe('약 21,000');
}

describe('countUp은 세는 동안이 아니면 원래 글자를 남긴다', () => {
  test('시작 전에는 0을 쓰지 않는다(0은 세기 시작할 때 쓴다)', () => {
    const el = fakeEl('약 21,000');
    const tween = count(el, '약 21,000');
    expect(el.textContent).toBe('약 21,000');
    tween.kill();
  });

  test('시작 전에 gsap.context가 되돌려도 원래 글자가 남는다', () => {
    const el = fakeEl();
    const { ctx } = countInContext(el, '약 21,000');
    ctx.revert();
    expect(el.textContent).toBe('약 21,000');
  });

  test('세는 도중에 gsap.context가 되돌리면 원래 글자로 돌아온다', () => {
    const el = fakeEl();
    const { ctx, tween } = countInContext(el, '약 21,000');
    tween.progress(0.5);
    expectMidCount(el);
    ctx.revert();
    expect(el.textContent).toBe('약 21,000');
  });

  test('세는 도중에 kill해도 원래 글자로 돌아온다', () => {
    const el = fakeEl();
    const tween = count(el, '약 21,000');
    tween.progress(0.5);
    expectMidCount(el);
    tween.kill();
    expect(el.textContent).toBe('약 21,000');
  });

  test('끝까지 세면 원래 글자로 끝난다', () => {
    const el = fakeEl();
    const tween = count(el, '194/194');
    tween.progress(1);
    expect(el.textContent).toBe('194/194');
  });

  test('끝까지 세면 수의 모양이 달라도(앞의 0) 원래 글자 그대로 끝난다', () => {
    // 마지막 갱신은 '7건'을 쓴다. 원래 글자 '007건'을 되돌리는 것은 onComplete다.
    const el = fakeEl();
    const tween = count(el, '007건');
    tween.progress(1);
    expect(el.textContent).toBe('007건');
  });

  test('처음으로 되감으면 원래 글자로 돌아온다', () => {
    const el = fakeEl();
    const tween = count(el, '약 21,000');
    tween.progress(0.5);
    expectMidCount(el);
    tween.progress(0);
    expect(el.textContent).toBe('약 21,000');
    tween.kill();
  });

  test('숫자가 없으면 null을 돌려주고 글자를 건드리지 않는다', () => {
    const el = fakeEl('리뷰 대기');
    expect(countUp(el, '리뷰 대기')).toBeNull();
    expect(el.textContent).toBe('리뷰 대기');
  });
});
