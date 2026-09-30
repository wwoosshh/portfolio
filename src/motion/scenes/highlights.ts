import { countUp } from '../effects';
import { gsap, ScrollTrigger } from '../gsap';
import { claim, reachableStart } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

/** 숫자가 항목보다 늦게 튕기기 시작하는 시각(초). */
const FIGURE_AT = 0.1;
/** 같은 타임라인에서 다음 숫자가 시작하는 간격(초). */
const FIGURE_STEP = 0.12;

registerScene('highlights', (root, { mode }) => {
  if (mode === 'static') return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('.hl__item'));
  const figureOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-figure]');
  const numsOf = (group: HTMLElement[]) => group.map(figureOf).filter((n): n is HTMLElement => n !== null);
  const finals = new Map<HTMLElement, string>(numsOf(items).map((n): [HTMLElement, string] => [n, n.textContent ?? '']));
  claim(...items);

  // 항목이 한 줄에 다 있으면 하나의 타임라인이 차례로 재생한다. 줄바꿈되어 여러 줄이면(P1-R27) 접힌 선 아래의 숫자가
  // 보이기 전에 혼자 튕겨 끝나 버리므로, 항목마다 자기 위치가 화면에 들어올 때 따로 재생한다(항목 사이 지연은 없다).
  // 어느 쪽인지는 설치할 때 한 번 정한다. 설치는 모드가 바뀔 때만 다시 하므로, 같은 모드 안에서 1024px을 넘나들어도 그대로다.
  const oneRow = items.every((item) => item.offsetTop === items[0].offsetTop);
  const groups = oneRow ? [items] : items.map((item) => [item]);

  const timelines: gsap.core.Timeline[] = [];
  const triggers: ScrollTrigger[] = [];
  for (const group of groups) {
    const nums = numsOf(group);
    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE.out, duration: DURATION.base } });
    tl.fromTo(group, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.1 }).fromTo(
      nums,
      { y: -60, rotation: -10, opacity: 0 },
      { y: 0, rotation: 0, opacity: 1, ease: EASE.back, duration: DURATION.slow, stagger: FIGURE_STEP },
      FIGURE_AT,
    );
    nums.forEach((n, i) => {
      const counter = countUp(n, finals.get(n) ?? '');
      if (counter) tl.add(counter, FIGURE_AT + i * FIGURE_STEP);
    });
    timelines.push(tl);
    triggers.push(
      playOnEnter(
        tl,
        oneRow ? { trigger: root, start: 'top 75%' } : { trigger: group[0], start: reachableStart(group[0], 0.85) },
      ),
    );
  }

  return () => {
    for (const t of triggers) t.kill();
    for (const tl of timelines) tl.kill();
    // 두 번째 안전망(P1-R11): countUp이 글자를 스스로 되돌리지만, 이벤트 없이 타임라인이 꺼진 경우는 이 되돌림이 맡는다.
    finals.forEach((text, n) => {
      n.textContent = text;
    });
  };
});
