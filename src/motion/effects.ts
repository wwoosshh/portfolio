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

/**
 * 글자 속 첫 수를 0부터 세어 올린다.
 * 세는 동안이 아니면(시작 전·끝·중단·되돌림) el의 글자는 항상 원래 글자(text)다:
 * 0은 실제로 세기 시작할 때(onStart) 쓰고, 끝나거나 멈추거나 되감기면 원래 글자로 돌린다.
 */
export function countUp(el: HTMLElement, text: string, duration = DURATION.slow * 1.5): gsap.core.Tween | null {
  const parts = parseCount(text);
  if (!parts) return null;
  const state = { v: 0 };
  const restore = () => {
    el.textContent = text;
  };
  return gsap.to(state, {
    v: parts.target,
    duration,
    ease: EASE.out,
    onStart: () => {
      el.textContent = formatCount(parts, 0);
    },
    onUpdate: () => {
      el.textContent = formatCount(parts, Math.round(state.v));
    },
    // 끝은 onComplete, kill·gsap.context revert는 onInterrupt, 되감기는 onReverseComplete가 알려 준다.
    onComplete: restore,
    onInterrupt: restore,
    onReverseComplete: restore,
  });
}
