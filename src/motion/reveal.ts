import { gsap, ScrollTrigger } from './gsap';
import { DURATION, EASE } from './tokens';

/** 장면이 직접 움직이는 요소는 기본 등장에서 뺀다. */
export function claim(...targets: Element[]): void {
  for (const el of targets) (el as HTMLElement).dataset.revealClaimed = '';
}

/**
 * 요소 위쪽이 화면 높이의 at 지점에 닿는 스크롤 위치. 문서 끝에 가까워 그 위치까지 스크롤할 수 없으면
 * 맨 아래 직전으로 당겨, 맨 아래까지 스크롤하면 반드시 시작되게 한다. ScrollTrigger가 새로 계산할 때마다 다시 잰다.
 */
export function reachableStart(el: Element, at = 0.9): () => number {
  return () => {
    const y = Number(gsap.getProperty(el, 'y')) || 0; // 등장 전 y 이동은 빼고 잰다
    const top = el.getBoundingClientRect().top + window.scrollY - y;
    return Math.min(top - window.innerHeight * at, ScrollTrigger.maxScroll(window) - 1);
  };
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
        scrollTrigger: { trigger: el, start: reachableStart(el), once: true },
      },
    );
  });
}

/** 키보드 초점이 아직 드러나지 않은 [data-reveal] 안으로 들어오면 그 조상들을 바로 드러낸다(초점 표시가 보이도록). */
export function revealOnFocus(): void {
  document.addEventListener('focusin', (event) => {
    let el = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-reveal]') : null;
    while (el) {
      if (Number(getComputedStyle(el).opacity) < 1) {
        // overwrite: true — 아직 시작하지 않은 등장 연출까지 없애, 나중에 다시 숨었다 나타나지 않게 한다.
        gsap.to(el, { opacity: 1, y: 0, duration: DURATION.fast, ease: EASE.out, overwrite: true });
      }
      el = el.parentElement?.closest<HTMLElement>('[data-reveal]') ?? null;
    }
  });
}
