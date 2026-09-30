import { countUp, shake } from '../effects';
import { gsap, ScrollTrigger, SplitText } from '../gsap';
import { claim, reachableStart } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

/** full에서 판정 장면이 이어지는 시각(초). 글·오라클 위쪽은 0초에 시작하고, 결과 행은 0.8초에 나타난다. */
const VERDICT_AT = 0.8;
/** 소개 글(문단·버튼)이 나타나기 시작하는 시각(초)과 차례 사이 간격(초). 판정의 설명은 이 묶음의 다음 차례로 나타난다. */
const LEAD_AT = 1.0;
const LEAD_STAGGER = 0.08;

/**
 * 히어로 연출은 세 부분으로 나뉜다(P1-R19).
 * - 글: 표제·제목·소개·버튼. full과 lite 모두 불러오면 바로 재생한다.
 * - 오라클 위쪽: 실행 수(세어 올림)·눈금·코드. full은 바로, lite는 오라클 상단이 화면 높이의 90%에 닿을 때.
 * - 오라클 판정: 결과 행 → 설명 → 불일치 표시·흔들림 → 판정 표지. full은 0.8초에, lite는 결과 행 상단이 화면 높이의 80%에 닿을 때.
 * 폰에서는 판정 장면이 접힌 선 아래에서 혼자 끝나 버리지 않고, 방문자가 볼 수 있을 때 재생한다.
 */
registerScene('hero', (root, { mode }) => {
  if (mode === 'static') return;
  const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const title = root.querySelector<HTMLElement>('.hero__title');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const countRow = root.querySelector<HTMLElement>('.hero__count');
  const ticksEl = root.querySelector<HTMLElement>('.hero__ticks');
  const figure = root.querySelector<HTMLElement>('.hero__oracle');
  const rowsEl = root.querySelector<HTMLElement>('.hero__rows');
  const mismatch = root.querySelector<HTMLElement>('[data-mismatch]');
  if (!title || !count || !countRow || !ticksEl || !figure || !rowsEl || !mismatch) return;

  const kicker = all('.hero__kicker');
  const lead = all('.hero__lead p, .hero__actions');
  const ticks = all('.hero__tick');
  const code = all('.hero__code');
  const rows = all('.hero__row');
  const caption = all('.hero__caption');
  const flag = all('[data-flag]');
  // 실행 수와 눈금도 맡는다: 맡지 않으면 lite에서 실제 글자가 보였다가 countUp이 0으로 바꾸는 깜빡임이 돌아온다.
  claim(title, countRow, ticksEl, ...kicker, ...lead, ...code, ...rows, ...caption, ...flag);

  const split = new SplitText(title, { type: 'words' });
  const finalCount = count.textContent ?? '';

  const addText = (tl: gsap.core.Timeline) => {
    tl.set(title, { opacity: 1 }, 0)
      .fromTo(kicker, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0)
      .fromTo(split.words, { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, stagger: 0.05, duration: DURATION.slow }, 0.3)
      .fromTo(root.querySelector('.hero__title .mark'), { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: DURATION.slow }, 0.9)
      .fromTo(lead, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: LEAD_STAGGER }, LEAD_AT);
  };

  const addTop = (tl: gsap.core.Timeline) => {
    // 실행 수 줄과 눈금 막대는 기본 등장(reveal.ts)과 같은 이동량으로 나타난다. 숨김은 CSS의 [data-reveal]이 맡는다.
    tl.fromTo([countRow, ticksEl], { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, 0)
      .fromTo(ticks, { scale: 0 }, { scale: 1, stagger: 0.025, duration: DURATION.fast }, 0)
      .fromTo(code, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.4);
    const counter = countUp(count, finalCount, 1.6);
    if (counter) tl.add(counter, 0);
  };

  // 결과 행 → (소개 글의 다음 차례: 문단 둘과 버튼이면 0.44초) 설명 → (0.6초) 불일치 표시와 흔들림 → (0.9초) 판정 표지
  const captionDelay = LEAD_AT - VERDICT_AT + lead.length * LEAD_STAGGER;
  const addVerdict = (tl: gsap.core.Timeline, at: number) => {
    tl.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.15 }, at)
      .fromTo(caption, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, at + captionDelay)
      .add(() => mismatch.classList.add('is-flagged'), at + 0.6)
      .add(shake(mismatch), at + 0.6)
      .fromTo(flag, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, at + 0.9);
  };

  const timelines: gsap.core.Timeline[] = [];
  const triggers: ScrollTrigger[] = [];
  const timeline = () => {
    const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DURATION.base } });
    timelines.push(tl);
    return tl;
  };
  // lite: 요소 상단이 화면 높이의 at 지점에 닿으면 한 번 재생한다. 이미 닿아 있으면 곧바로 재생된다.
  const playWhenVisible = (tl: gsap.core.Timeline, el: HTMLElement, at: number) => {
    triggers.push(playOnEnter(tl, { trigger: el, start: reachableStart(el, at) }));
  };

  if (mode === 'full') {
    const tl = timeline();
    addText(tl);
    addTop(tl);
    addVerdict(tl, VERDICT_AT);
  } else {
    addText(timeline());
    const top = timeline();
    addTop(top);
    playWhenVisible(top, figure, 0.9);
    const verdict = timeline();
    addVerdict(verdict, 0);
    playWhenVisible(verdict, rowsEl, 0.8);
  }

  return () => {
    for (const t of triggers) t.kill();
    for (const tl of timelines) tl.kill();
    split.revert();
    mismatch.classList.remove('is-flagged');
    count.textContent = finalCount;
  };
});
