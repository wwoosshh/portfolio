import { gsap, ScrollTrigger } from './gsap';
import { topbarOffset } from './layout';
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
const PLACE_KEY = `motion:place:${location.pathname}`;

interface Place {
  id: string;
  ratio: number;
}

/** 읽던 곳: 상단 바 바로 아래 선이 지나는 장(main > section[id])과 그 장 안에서의 비율. 고정 여백이 생기거나 사라져도 같은 내용으로 돌아온다. */
function readingPlace(): Place | null {
  const line = topbarOffset() + 1;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'))) {
    const r = el.getBoundingClientRect();
    if (r.bottom > line) return { id: el.id, ratio: r.height > 0 ? Math.max(0, (line - r.top) / r.height) : 0 };
  }
  return null;
}

function restorePlace(p: Place): void {
  const el = document.getElementById(p.id);
  if (!el) return;
  const r = el.getBoundingClientRect();
  window.scrollTo(0, r.top + window.scrollY + p.ratio * r.height - (topbarOffset() + 1));
}

/** 떠날 때 읽던 곳을 적어 둔다. 대체 동작·실패한 방문에서도 적어야 다음 방문이 이어받는다. */
function savePlace(): void {
  try {
    sessionStorage.setItem(PLACE_KEY, JSON.stringify(readingPlace()));
  } catch {
    /* 저장소를 못 쓰면 브라우저의 복원에 맡긴다 */
  }
}

/** 새로 고침·뒤로 가기로 돌아왔다면 떠날 때 읽던 곳. 브라우저의 복원은 고정 여백이 없는 문서 기준이라 어긋난다(OI-1b). */
function savedPlace(): Place | null {
  try {
    const nav = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;
    if (nav !== 'reload' && nav !== 'back_forward') return null;
    return JSON.parse(sessionStorage.getItem(PLACE_KEY) ?? 'null') as Place | null;
  } catch {
    return null;
  }
}

export async function start(): Promise<void> {
  const html = document.documentElement;
  window.addEventListener('pagehide', savePlace);
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
    // 고정 구간이 만드는 여백은 브라우저가 스크롤을 복원한 뒤에 생긴다(OI-1b). 새로 고침·뒤로 가기는 떠날 때 읽던 곳으로, 그 밖에는 해시가 가리키는 곳으로 다시 스크롤한다.
    // :target은 브라우저가 해시를 해석한 결과다. decodeURIComponent로 직접 풀면 잘못된 인코딩(#%E0%A4%A)에서 오류가 나 연출 전체가 꺼진다.
    const saved = savedPlace();
    if (saved) restorePlace(saved);
    else document.querySelector(':target')?.scrollIntoView();

    // OI-1: 모드가 바뀌면 ScrollTrigger는 스크롤을 0에 두고 다시 잰 뒤 기록한 위치로 돌아가는데, 새 모드의 장면이
    // 트리거를 만들 때(생성자의 refresh가 scroll.rec = 0) 그 기록이 지워져 맨 위에 남는다. 전환 직전에 읽던 곳으로 돌린다.
    // history.scrollRestoration은 건드리지 않는다: ScrollTrigger가 등록할 때 잡아 두었다가 되돌려 쓴다.
    let place = readingPlace();
    let frame = 0;
    window.addEventListener(
      'scroll',
      () => {
        frame ||= requestAnimationFrame(() => {
          frame = 0;
          place = readingPlace();
        });
      },
      { passive: true },
    );
    ScrollTrigger.addEventListener('matchMedia', () => {
      if (place) restorePlace(place);
    });

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
