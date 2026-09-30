import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** [data-tilt] 카드가 마우스 위치를 따라 기운다(설계 §4.4 강조, full 모드 전용). */
export function enableTilt(root: ParentNode): () => void {
  const offs = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt]')).map((card) => {
    gsap.set(card, { transformPerspective: 800 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: DURATION.base, ease: EASE.out });
    const ry = gsap.quickTo(card, 'rotationY', { duration: DURATION.base, ease: EASE.out });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = card.getBoundingClientRect();
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      ry(((e.clientX - r.left) / r.width - 0.5) * 12);
    };
    const leave = () => {
      rx(0);
      ry(0);
    };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    return () => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
      gsap.set(card, { clearProps: 'transform' });
    };
  });
  return () => {
    for (const off of offs) off();
  };
}
