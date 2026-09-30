import { gsap } from '../gsap';
import { claim } from '../reveal';
import { registerScene } from '../registry';
import { DURATION } from '../tokens';
import { playOnEnter } from '../trigger';

registerScene('project', (root, { mode }) => {
  if (mode === 'static') return;
  const text = Array.from(root.querySelectorAll<HTMLElement>('.pscene__text [data-reveal]'));
  const panel = root.querySelector<HTMLElement>('.pscene__panel');
  const metrics = Array.from(root.querySelectorAll<HTMLElement>('.pscene__metric'));
  if (!panel) return;
  claim(...text, panel);

  const tl = gsap.timeline();
  tl.fromTo(text, { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08 })
    .fromTo(panel, { opacity: 0, x: mode === 'full' ? 40 : 0, y: mode === 'full' ? 0 : 20 }, { opacity: 1, x: 0, y: 0, duration: DURATION.slow }, 0.1)
    .fromTo(metrics, { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.08 }, 0.4);
  const st = playOnEnter(tl, { trigger: root, start: 'top 75%' });

  return () => {
    st.kill();
    tl.kill();
  };
});
