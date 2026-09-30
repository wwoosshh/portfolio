export interface CountParts {
  prefix: string;
  target: number;
  suffix: string;
  grouped: boolean;
}

/** "약 21,000"·"194/194"처럼 글자 속 첫 수를 찾아 세어 올릴 수 있게 나눈다. */
export function parseCount(text: string): CountParts | null {
  const m = text.match(/^(\D*?)(\d[\d,]*)([\s\S]*)$/);
  if (!m) return null;
  const [, prefix, digits, suffix] = m;
  return { prefix, target: Number(digits.replaceAll(',', '')), suffix, grouped: digits.includes(',') };
}

export function formatCount(parts: CountParts, n: number): string {
  const body = parts.grouped ? n.toLocaleString('ko-KR') : String(n);
  return `${parts.prefix}${body}${parts.suffix}`;
}
