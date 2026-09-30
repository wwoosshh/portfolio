export type MotionMode = 'full' | 'lite' | 'static';

export const BREAKPOINT = 768;

export const MEDIA: Record<MotionMode, string> = {
  full: `(min-width: ${BREAKPOINT}px) and (prefers-reduced-motion: no-preference)`,
  lite: `(max-width: ${BREAKPOINT - 1}px) and (prefers-reduced-motion: no-preference)`,
  static: '(prefers-reduced-motion: reduce)',
};

export function motionMode(env: { reducedMotion: boolean; width: number }): MotionMode {
  if (env.reducedMotion) return 'static';
  return env.width >= BREAKPOINT ? 'full' : 'lite';
}
