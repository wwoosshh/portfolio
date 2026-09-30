import { gsap, ScrollTrigger } from '../gsap';
import { topbarOffset } from '../layout';
import { claim } from '../reveal';
import { type Cleanup, registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

/** 슬라이드를 고정해 가로로 넘기려면 한 슬라이드(수치·근거·도면)가 들어갈 만큼 화면이 높아야 한다. 이보다 낮은 가로 화면(가로 폰 등)은 쌓아서 보여 준다. */
const PIN_MIN_HEIGHT = 600;

function drawDiagram(slide: HTMLElement): gsap.core.Timeline {
  const pop = slide.querySelectorAll('[data-pop]');
  const draw = slide.querySelectorAll('[data-draw]');
  const fade = slide.querySelectorAll('[data-fade]');
  return gsap
    .timeline()
    .fromTo(pop, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, stagger: 0.03, ease: EASE.back })
    .fromTo(draw, { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.12, duration: DURATION.slow }, 0.1)
    .fromTo(fade, { opacity: 0 }, { opacity: 1, stagger: 0.04 }, '>-0.3');
}

/** 고정 없이 세로로 쌓인 슬라이드를 각자 화면에 들어올 때 한 번 그린다. lite와, 고정하기에는 낮은 화면의 full이 함께 쓴다. */
function stacked(slides: HTMLElement[], texts: HTMLElement[][]): Cleanup {
  const tls = slides.map((slide, i) => {
    const tl = gsap.timeline();
    tl.fromTo(texts[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.06 }).add(drawDiagram(slide), 0.2);
    return tl;
  });
  const triggers = slides.map((slide, i) => playOnEnter(tls[i], { trigger: slide, start: 'top 75%' }));
  return () => {
    for (const t of triggers) t.kill();
    for (const tl of tls) tl.kill();
  };
}

/** 고정하고 가로로 넘긴다. 슬라이드는 기울며 들어오고 나간다(설계 §4.4 강조). */
function pinned(
  root: HTMLElement,
  slides: HTMLElement[],
  texts: HTMLElement[][],
  viewport: HTMLElement,
  track: HTMLElement,
): Cleanup {
  const skip = root.querySelector<HTMLButtonElement>('[data-deck-skip]');
  root.dataset.pinned = '';
  // 배치 폭(offsetWidth)으로 잰다. scrollWidth는 기울어진 마지막 슬라이드의 모서리까지 재서, 끝에서 슬라이드가 15px 덜 온다.
  const distance = () => track.offsetWidth - viewport.clientWidth;

  const move = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: root,
      pin: true,
      scrub: 0.8,
      start: () => `top ${topbarOffset()}px`,
      end: () => `+=${distance()}`,
      invalidateOnRefresh: true,
    },
  });

  const triggers: ScrollTrigger[] = [];
  const anims: gsap.core.Animation[] = [];
  slides.forEach((slide, i) => {
    const show = gsap.timeline();
    show.fromTo(texts[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.06 }).add(drawDiagram(slide), 0.2);
    // 첫 슬라이드의 왼쪽 가장자리는 고정이 시작되기 전부터 70% 선 안쪽이다. 덱이 화면에 올라올 때 보이도록 덱 자체를 기준으로 한다(P1-R22).
    triggers.push(
      i === 0
        ? playOnEnter(show, { trigger: root, start: 'top 70%' })
        : playOnEnter(show, { trigger: slide, containerAnimation: move, start: 'left 70%' }),
    );
    anims.push(show);
    if (i > 0) {
      anims.push(
        gsap.fromTo(
          slide,
          { rotation: 5, yPercent: 4 },
          {
            rotation: 0,
            yPercent: 0,
            ease: 'none',
            scrollTrigger: { trigger: slide, containerAnimation: move, start: 'left right', end: 'left 40%', scrub: true },
          },
        ),
      );
    }
    if (i < slides.length - 1) {
      // 나가는 기울기는 fromTo로 시작 값을 못 박는다. 들어올 때의 기울기와 같은 속성을 만지므로, to()는 스크럽 중간 값을 시작 값으로 기록할 수 있다(P1-R23).
      anims.push(
        gsap.fromTo(
          slide,
          { rotation: 0, opacity: 1 },
          {
            rotation: -5,
            opacity: 0.35,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: { trigger: slide, containerAnimation: move, start: 'right 60%', end: 'right left', scrub: true },
          },
        ),
      );
    }
  });

  // 고정이 끝난 뒤에도 덱은 한 화면 높이로 남는다. 고정 구간의 끝(st.end)까지만 가면 마지막 슬라이드에 머무르므로, 덱이 든 섹션의 다음 섹션으로 간다.
  // 초점도 그 섹션의 제목으로 옮긴다. 버튼에 남아 있으면 다음 Tab이 덱 안으로 돌아가 스크롤을 끌고 간다.
  let focused: HTMLElement | null = null;
  const onSkip = () => {
    const next = root.closest('section')?.nextElementSibling;
    const st = move.scrollTrigger;
    if (!next) {
      if (st) window.scrollTo({ top: st.end + 2 });
      return;
    }
    next.scrollIntoView();
    focused = next.querySelector<HTMLElement>('h1, h2, h3');
    if (focused) {
      focused.tabIndex = -1;
      focused.focus({ preventScroll: true });
    }
  };
  skip?.addEventListener('click', onSkip);

  // 키보드 초점이 화면 밖 슬라이드로 가면, 잘린 영역을 옆으로 민 것을 되돌리고 그 슬라이드가 보이는 위치로 스크롤한다.
  // 마우스로 누른 링크는 이미 보이는 곳에 있으므로 스크롤을 옮기지 않는다.
  const onFocus = (event: FocusEvent) => {
    if (!(event.target instanceof Element) || !event.target.matches(':focus-visible')) return;
    viewport.scrollLeft = 0;
    const slide = event.target.closest<HTMLElement>('.deck__slide');
    const st = move.scrollTrigger;
    if (!slide || !st) return;
    const d = distance();
    const x = Math.min(slide.offsetLeft, d);
    window.scrollTo({ top: st.start + (d > 0 ? x / d : 0) * (st.end - st.start) });
  };
  root.addEventListener('focusin', onFocus);

  return () => {
    try {
      skip?.removeEventListener('click', onSkip);
      root.removeEventListener('focusin', onFocus);
      focused?.removeAttribute('tabindex');
      for (const t of triggers) t.kill();
      for (const a of anims) {
        a.scrollTrigger?.kill();
        a.kill();
      }
      move.scrollTrigger?.kill();
      move.kill();
    } finally {
      // 위의 정리가 중간에 실패해도 고정 배치 표시는 반드시 지운다.
      delete root.dataset.pinned;
    }
  };
}

registerScene('deck', (root, { mode }) => {
  if (mode === 'static') return;
  const slides = Array.from(root.querySelectorAll<HTMLElement>('.deck__slide'));
  const texts = slides.map((s) => Array.from(s.querySelectorAll<HTMLElement>('[data-reveal]')));

  if (mode === 'lite') {
    claim(...texts.flat());
    return stacked(slides, texts);
  }

  const viewport = root.querySelector<HTMLElement>('.deck__viewport');
  const track = root.querySelector<HTMLElement>('.deck__track');
  if (!viewport || !track) return;
  claim(...texts.flat());

  // full이라도 화면이 낮으면 고정하지 않고 lite처럼 쌓는다. 높이가 바뀌어 기준을 넘나들면 이 안쪽 컨텍스트만 다시 만든다.
  const fit = gsap.matchMedia();
  fit.add(`(min-height: ${PIN_MIN_HEIGHT}px)`, () => pinned(root, slides, texts, viewport, track));
  fit.add(`not all and (min-height: ${PIN_MIN_HEIGHT}px)`, () => stacked(slides, texts));
  return () => fit.revert();
});
