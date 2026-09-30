// src/styles/tokens.css의 움직임 토큰과 같은 값이다. tokens.test.ts가 두 곳이 같은지 검사한다.
export const DURATION = { fast: 0.2, base: 0.4, slow: 0.8 } as const; // 초(GSAP 단위)

export const CURVE = {
  out: [0.2, 0.8, 0.2, 1],
  inOut: [0.7, 0, 0.3, 1],
  back: [0.34, 1.56, 0.64, 1],
} as const;

// CustomEase로 등록하는 이름(gsap.ts)
export const EASE = { out: 'siteOut', inOut: 'siteInOut', back: 'siteBack' } as const;

export function curvePath([x1, y1, x2, y2]: readonly number[]): string {
  return `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;
}
