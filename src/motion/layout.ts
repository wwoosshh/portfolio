/** 고정 상단 바의 높이(px). tokens.css의 --topbar-h를 읽는다. */
export function topbarOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--topbar-h');
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) ? px : 0;
}
