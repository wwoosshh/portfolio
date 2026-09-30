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
      // visibility는 건드리지 않는다: 숨은 동안에도 키보드 초점과 보조 기술이 내용에 닿아야 한다.
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: DURATION.base,
        ease: EASE.out,
        // clamp: 문서 끝에 너무 가까워 90% 지점까지 스크롤할 수 없는 요소도 맨 아래에서 등장한다.
        scrollTrigger: { trigger: el, start: 'clamp(top 90%)', once: true },
      },
    );
  });
}
