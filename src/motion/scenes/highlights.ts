import { countUp } from '../effects';
import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('highlights', (root, { mode }) => {
  if (mode === 'static') return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('.hl__item'));
  const nums = items.map((item) => item.querySelector<HTMLElement>('[data-figure]')).filter((n): n is HTMLElement => n !== null);
  const finals = nums.map((n) => n.textContent ?? '');
  claim(...items);

  const tl = gsap.timeline({ scrollTrigger: { trigger: root, start: 'top 75%', once: true } });
  tl.fromTo(items, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.1 }).fromTo(
    nums,
    { y: -60, rotation: -10, opacity: 0 },
    { y: 0, rotation: 0, opacity: 1, ease: EASE.back, duration: DURATION.slow, stagger: 0.12 },
    0.1,
  );
  nums.forEach((n, i) => {
    const counter = countUp(n, finals[i]);
    if (counter) tl.add(counter, 0.1 + i * 0.12);
  });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    nums.forEach((n, i) => {
      n.textContent = finals[i];
    });
  };
});
