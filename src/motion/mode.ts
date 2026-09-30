export type MotionMode = 'full' | 'lite' | 'static';

export const BREAKPOINT = 768;

export const MEDIA: Record<MotionMode, string> = {
  full: `(min-width: ${BREAKPOINT}px) and (prefers-reduced-motion: no-preference)`,
  // 767.98px: 확대·화면 배율로 생기는 767~768 사이 소수 폭도 lite가 받는다(full과의 틈은 0.02px 이하).
  lite: `(max-width: ${BREAKPOINT - 0.02}px) and (prefers-reduced-motion: no-preference)`,
  static: '(prefers-reduced-motion: reduce)',
};

export function motionMode(env: { reducedMotion: boolean; width: number }): MotionMode {
  if (env.reducedMotion) return 'static';
  return env.width >= BREAKPOINT ? 'full' : 'lite';
}
