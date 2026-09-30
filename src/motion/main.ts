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

/** 글꼴을 기다리는 최대 시간. 늦으면 대체 글꼴로 시작하고, 다 받은 뒤 위치를 다시 잰다. */
const FONT_WAIT_MS = 1000;

export async function start(): Promise<void> {
  const html = document.documentElement;
  // 3초 안에 시작하지 못해 대체 동작이 이미 내용을 보였다면, 이번 방문은 움직임 없이 그대로 둔다(설계 §5.1).
  if (html.classList.contains('motion-failed')) {
    startTopbar();
    html.dataset.motion = 'fallback';
    return;
  }
  const mm = gsap.matchMedia();
  if (window.__motionFallback !== undefined) window.clearTimeout(window.__motionFallback);

  try {
    await Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS))]);

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
    // 고정 구간이 만드는 여백은 브라우저가 해시 위치로 스크롤한 뒤에 생긴다. 해시가 가리키는 곳으로 다시 스크롤한다.
    // :target은 브라우저가 해시를 해석한 결과다. decodeURIComponent로 직접 풀면 잘못된 인코딩(#%E0%A4%A)에서 오류가 나 연출 전체가 꺼진다.
    document.querySelector(':target')?.scrollIntoView();
    html.dataset.motion = 'ready';
    // 글꼴이 늦게 도착해 줄바꿈이 달라지면 스크롤 위치를 다시 잰다.
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  } catch (error) {
    // 연출이 실패해도 내용은 보여야 한다(설계 §5.1). 먼저 움직임을 끄고, 그다음 만든 연출을 되돌린다.
    console.error('[motion] 연출을 시작하지 못했습니다', error);
    html.classList.remove('motion');
    html.classList.add('motion-failed');
    html.dataset.motion = 'failed';
    try {
      mm.revert();
    } catch (revertError) {
      console.error('[motion] 연출을 되돌리지 못했습니다', revertError);
    }
  }
}
