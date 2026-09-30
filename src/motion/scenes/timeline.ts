import { gsap } from '../gsap';
import { registerScene } from '../registry';
import { playOnEnter } from '../trigger';

registerScene('timeline', (root, { mode }) => {
  if (mode === 'static') return;
  const progress = root.querySelector<HTMLElement>('.timeline__progress');
  if (!progress) return;
  const tween = gsap.fromTo(
    progress,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: mode === 'full' ? { trigger: root, start: 'top 70%', end: 'bottom 60%', scrub: 0.5 } : undefined,
    },
  );
  // lite: 스크럽 없이 화면에 들어오면 한 번 그린다.
  const st = mode === 'lite' ? playOnEnter(tween, { trigger: root, start: 'top 80%' }) : undefined;
  return () => {
    tween.scrollTrigger?.kill();
    st?.kill();
    tween.kill();
  };
});
