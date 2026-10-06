import { countUp } from '../effects';
import { gsap, ScrollTrigger } from '../gsap';
import { claim, reachableStart } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

/** 요약 숫자가 세어 올라가기 시작하는 시각(초)과 다음 숫자까지의 간격(초). */
const COUNT_AT = 0.2;
const COUNT_STEP = 0.1;

/** 병합된 항목과, 그 항목 자신의 상태 칩(Status.astro의 루트 .status). 관련 PR 줄의 칩은 찍지 않는다. */
const MERGED_ITEM = '.cboard__item[data-state="merged"]';
const CHIP = ':scope > .cboard__head > .status';

registerScene('contrib', (root, { mode }) => {
  if (mode === 'static') return;
  const head = Array.from(root.querySelectorAll<HTMLElement>('.cboard__title, .cboard__sum'));
  const counts = Array.from(root.querySelectorAll<HTMLElement>('[data-tally]'));
  const finals = new Map<HTMLElement, string>(counts.map((el): [HTMLElement, string] => [el, el.textContent ?? '']));
  const groups = Array.from(root.querySelectorAll<HTMLElement>('.cboard__repo'));
  const partsOf = (group: HTMLElement) => Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'));
  // 맨 아래 "매일 자동 확인" 줄은 맡지 않는다. 기본 등장이 보일 때 올린다.
  claim(...head, ...groups.flatMap(partsOf));

  const timelines: gsap.core.Timeline[] = [];
  const triggers: ScrollTrigger[] = [];

  const intro = gsap.timeline();
  intro.fromTo(head, { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.08 });
  counts.forEach((el, i) => {
    const counter = countUp(el, finals.get(el) ?? '');
    if (counter) intro.add(counter, COUNT_AT + i * COUNT_STEP);
  });
  timelines.push(intro);
  triggers.push(playOnEnter(intro, { trigger: root, start: 'top 75%' }));

  // 묶음마다 자기 위치가 화면에 들어올 때 따로 재생한다. 묶음 길이가 제각각이라 한꺼번에 재생하면 아래 묶음은 보이기 전에 끝난다.
  for (const group of groups) {
    const tl = gsap.timeline();
    tl.fromTo(partsOf(group), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.05 });
    timelines.push(tl);
    triggers.push(playOnEnter(tl, { trigger: group, start: reachableStart(group, 0.85) }));

    // 이 장면의 큰 동작(설계 §3): 병합 칩이 도장처럼 찍힌다. 묶음 타임라인 끝에 이어 붙이면 묶음 아래쪽 병합 줄의 도장은 화면 밖에서 끝나 버린다.
    // 그래서 칩마다 자기 줄이 화면에 들어올 때 따로 찍는다. 찍히기 전까지 칩은 숨어 있다(fromTo가 곧바로 시작 값을 적용한다).
    for (const item of group.querySelectorAll<HTMLElement>(MERGED_ITEM)) {
      const chip = item.querySelector<HTMLElement>(CHIP);
      if (!chip) continue;
      const stamp = gsap.timeline();
      stamp.fromTo(chip, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, ease: EASE.back, duration: DURATION.slow });
      timelines.push(stamp);
      triggers.push(playOnEnter(stamp, { trigger: item, start: reachableStart(item, 0.8) }));
    }
  }

  return () => {
    for (const t of triggers) t.kill();
    for (const tl of timelines) tl.kill();
    // countUp이 글자를 스스로 되돌리지만, 이벤트 없이 타임라인이 꺼진 경우는 이 되돌림이 맡는다.
    finals.forEach((text, el) => {
      el.textContent = text;
    });
  };
});
