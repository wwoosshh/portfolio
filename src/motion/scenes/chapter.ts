import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

registerScene('chapter', (root, { mode }) => {
  if (mode === 'static') return;
  const parts = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  const mark = root.querySelector<HTMLElement>('.chapter__title .mark');
  claim(...parts);

  const tl = gsap.timeline(
    mode === 'full' ? { scrollTrigger: { trigger: root, start: 'top 85%', end: 'top 30%', scrub: 0.6 } } : {},
  );
  tl.fromTo(
    parts,
    { opacity: 0, rotationX: -70, y: 40, transformOrigin: '50% 100%' },
    { opacity: 1, rotationX: 0, y: 0, stagger: 0.12, ease: EASE.inOut, duration: DURATION.slow },
  );
  if (mark) tl.fromTo(mark, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: DURATION.slow }, '>-0.3');
  const st = mode === 'lite' ? playOnEnter(tl, { trigger: root, start: 'top 80%' }) : undefined;

  return () => {
    tl.scrollTrigger?.kill();
    st?.kill();
    tl.kill();
  };
});
