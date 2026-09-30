import { gsap } from './gsap';
import { DURATION, EASE } from './tokens';

/** 장면이 직접 움직이는 요소는 기본 등장에서 뺀다. */
export function claim(...targets: Element[]): void {
  for (const el of targets) (el as HTMLElement).dataset.revealClaimed = '';
}

/** 어떤 장면도 맡지 않은 [data-reveal] 요소를 화면에 들어올 때 한 번 올라오게 한다. */
export function revealRemaining(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-reveal-claimed])').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: DURATION.base,
        ease: EASE.out,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      },
    );
  });
}
