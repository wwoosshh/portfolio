import { gsap, ScrollTrigger } from '../gsap';
import { topbarOffset } from '../layout';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

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

registerScene('deck', (root, { mode }) => {
  if (mode === 'static') return;
  const slides = Array.from(root.querySelectorAll<HTMLElement>('.deck__slide'));
  const texts = slides.map((s) => Array.from(s.querySelectorAll<HTMLElement>('[data-reveal]')));
  claim(...texts.flat());

  if (mode === 'lite') {
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

  // full: 고정하고 가로로 넘긴다. 슬라이드는 기울며 들어오고 나간다(설계 §4.4 강조).
  const viewport = root.querySelector<HTMLElement>('.deck__viewport');
  const track = root.querySelector<HTMLElement>('.deck__track');
  const skip = root.querySelector<HTMLButtonElement>('[data-deck-skip]');
  if (!viewport || !track) return;
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
  const onSkip = () => {
    const next = root.closest('section')?.nextElementSibling;
    const st = move.scrollTrigger;
    if (next) next.scrollIntoView();
    else if (st) window.scrollTo({ top: st.end + 2 });
  };
  skip?.addEventListener('click', onSkip);

  // 키보드 초점이 화면 밖 슬라이드로 가면, 잘린 영역을 옆으로 민 것을 되돌리고 그 슬라이드가 보이는 위치로 스크롤한다.
  const onFocus = (event: FocusEvent) => {
    viewport.scrollLeft = 0;
    const slide = event.target instanceof Element ? event.target.closest<HTMLElement>('.deck__slide') : null;
    const st = move.scrollTrigger;
    if (!slide || !st) return;
    const d = distance();
    const x = Math.min(slide.offsetLeft, d);
    window.scrollTo({ top: st.start + (d > 0 ? x / d : 0) * (st.end - st.start) });
  };
  root.addEventListener('focusin', onFocus);

  return () => {
    skip?.removeEventListener('click', onSkip);
    root.removeEventListener('focusin', onFocus);
    for (const t of triggers) t.kill();
    for (const a of anims) {
      a.scrollTrigger?.kill();
      a.kill();
    }
    move.scrollTrigger?.kill();
    move.kill();
    delete root.dataset.pinned;
  };
});
