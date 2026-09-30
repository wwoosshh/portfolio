import { formatCount, parseCount } from './count';
import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** 불일치가 잡히는 순간의 흔들림(설계 §4.4 강조). 끝나면 제자리로 돌아온다. */
export function shake(target: Element): gsap.core.Timeline {
  return gsap
    .timeline()
    .to(target, { x: -7, rotation: -1.5, duration: 0.05, ease: 'none' })
    .to(target, { x: 7, rotation: 1.5, duration: 0.05, ease: 'none' })
    .to(target, { x: -5, rotation: -1, duration: 0.05, ease: 'none' })
    .to(target, { x: 5, rotation: 1, duration: 0.05, ease: 'none' })
    .to(target, { x: 0, rotation: 0, duration: DURATION.fast, ease: EASE.out });
}

/** 글자 속 첫 수를 0부터 세어 올리고, 끝나면 원래 글자로 되돌린다. */
export function countUp(el: HTMLElement, text: string, duration = DURATION.slow * 1.5): gsap.core.Tween | null {
  const parts = parseCount(text);
  if (!parts) return null;
  const state = { v: 0 };
  el.textContent = formatCount(parts, 0);
  return gsap.to(state, {
    v: parts.target,
    duration,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = formatCount(parts, Math.round(state.v));
    },
    onComplete: () => {
      el.textContent = text;
    },
  });
}
