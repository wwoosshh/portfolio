import { gsap } from '../gsap';
import { registerScene } from '../registry';
import { DURATION, EASE } from '../tokens';
import { playOnEnter } from '../trigger';

registerScene('how', (root, { mode }) => {
  if (mode === 'static') return;
  const pop = root.querySelectorAll('.how__flow [data-pop]');
  const draw = root.querySelectorAll('.how__flow [data-draw]');
  const tl = gsap.timeline();
  tl.fromTo(pop, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.15, ease: EASE.out }).fromTo(
    draw,
    { drawSVG: '0%' },
    { drawSVG: '100%', stagger: 0.15, duration: DURATION.base },
    0.15,
  );
  const st = playOnEnter(tl, { trigger: root, start: 'top 70%' });
  return () => {
    st.kill();
    tl.kill();
  };
});
