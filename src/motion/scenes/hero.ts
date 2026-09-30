import { countUp, shake } from '../effects';
import { gsap, SplitText } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';

registerScene('hero', (root, { mode }) => {
  if (mode === 'static') return;
  const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const title = root.querySelector<HTMLElement>('.hero__title');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const mismatch = root.querySelector<HTMLElement>('[data-mismatch]');
  if (!title || !count || !mismatch) return;

  const kicker = all('.hero__kicker');
  const code = all('.hero__code');
  const rows = all('.hero__row');
  const flag = all('[data-flag]');
  const after = all('.hero__lead p, .hero__actions, .hero__caption');
  claim(title, ...kicker, ...code, ...rows, ...flag, ...after);

  const split = new SplitText(title, { type: 'words' });
  const finalCount = count.textContent ?? '';
  const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DURATION.base } });
  tl.set(title, { opacity: 1 })
    .fromTo(kicker, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0)
    .fromTo(all('.hero__tick'), { scale: 0 }, { scale: 1, stagger: 0.025, duration: DURATION.fast }, 0)
    .fromTo(split.words, { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, stagger: 0.05, duration: DURATION.slow }, 0.3)
    .fromTo(code, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.4)
    .fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.15 }, 0.8)
    .fromTo(root.querySelector('.hero__title .mark'), { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: DURATION.slow }, 0.9)
    .fromTo(after, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.08 }, 1.0)
    .add(() => mismatch.classList.add('is-flagged'), 1.4)
    .add(shake(mismatch), 1.4)
    .fromTo(flag, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, 1.7);
  const counter = countUp(count, finalCount, 1.6);
  if (counter) tl.add(counter, 0);

  return () => {
    tl.kill();
    split.revert();
    mismatch.classList.remove('is-flagged');
    count.textContent = finalCount;
  };
});
