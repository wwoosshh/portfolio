import { gsap, ScrollTrigger } from './gsap';
import { MEDIA, type MotionMode } from './mode';
import { type Cleanup, sceneSetup } from './registry';
import { revealRemaining } from './reveal';
import './scenes';
import { startTopbar } from './topbar';

declare global {
  interface Window {
    __motionFallback?: number;
  }
}

export async function start(): Promise<void> {
  const html = document.documentElement;
  if (window.__motionFallback !== undefined) window.clearTimeout(window.__motionFallback);
  html.classList.remove('motion-failed');
  const mm = gsap.matchMedia();

  try {
    await document.fonts.ready;

    for (const mode of Object.keys(MEDIA) as MotionMode[]) {
      mm.add(MEDIA[mode], () => {
        html.classList.toggle('motion', mode !== 'static');
        const cleanups: Cleanup[] = [];
        for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'))) {
          const cleanup = sceneSetup(root.dataset.scene ?? '')?.(root, { mode });
          if (cleanup) cleanups.push(cleanup);
        }
        if (mode !== 'static') revealRemaining(document);
        return () => {
          for (const c of cleanups) c();
          // 장면이 맡았던 표시를 지운다. 다음 모드의 장면이 다시 맡는다.
          document.querySelectorAll<HTMLElement>('[data-reveal-claimed]').forEach((el) => {
            delete el.dataset.revealClaimed;
          });
        };
      });
    }

    startTopbar();
    ScrollTrigger.refresh();
    html.dataset.motion = 'ready';
  } catch (error) {
    // 연출이 실패해도 내용은 보여야 한다(설계 §5.1): 만든 연출을 모두 되돌리고 움직임을 끈다.
    console.error('[motion] 연출을 시작하지 못했습니다', error);
    mm.revert();
    html.classList.remove('motion');
    html.classList.add('motion-failed');
    html.dataset.motion = 'failed';
  }
}
