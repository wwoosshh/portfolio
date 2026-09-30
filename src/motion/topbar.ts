import { gsap, ScrollTrigger } from './gsap';

/** 진행 막대와 현재 장 표시. 움직임이 아니라 위치 표시이므로 모든 모드에서 쓴다. */
export function startTopbar(): void {
  const bar = document.querySelector<HTMLElement>('[data-progress-bar]');
  if (bar) {
    const setScale = gsap.quickSetter(bar, 'scaleX');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => setScale(self.progress) });
  }
  document.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]').forEach((link) => {
    const section = document.getElementById(link.dataset.chapterLink ?? '');
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => {
        if (self.isActive) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      },
    });
  });
}
