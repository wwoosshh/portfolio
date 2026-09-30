import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const TOKENS = 'styles/tokens.css';
const GLOBAL = 'styles/global.css';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (file: string) => path.relative(SRC, file).replaceAll('\\', '/');
const styleFiles = walk(SRC).filter((f) => /\.(astro|css)$/.test(f));
const read = (file: string) => readFileSync(file, 'utf8');

describe('디자인 규칙', () => {
  test('검사할 스타일 파일이 있다', () => {
    expect(styleFiles.map(rel)).toContain(TOKENS);
  });

  test('그림자를 쓰지 않는다', () => {
    const offenders = styleFiles.filter((f) => /(box|text)-shadow\s*:(?!\s*none)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  test('색 값은 tokens.css에서만 정의한다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== TOKENS)
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(read(f).replace(/href="[^"]*"/g, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('그라데이션은 global.css(형광펜·모눈 패널)에서만 쓴다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== GLOBAL)
      .filter((f) => /(linear|radial|conic)-gradient\(/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('transition·animation은 움직임 토큰만 쓴다', () => {
    const bad = styleFiles
      .filter((f) => ![TOKENS, GLOBAL].includes(rel(f)))
      .flatMap((f) =>
        [...read(f).matchAll(/(?<![-\w])(transition|animation)(-duration|-timing-function|-delay)?\s*:\s*([^;]+);/g)]
          .map((m) => m[3].replace(/var\([^)]*\)/g, '').trim())
          .filter((v) => /\d(ms|s)\b|cubic-bezier|\b(ease|ease-in|ease-out|ease-in-out|linear)\b/.test(v))
          .map((v) => `${rel(f)}: ${v}`),
      );
    expect(bad).toEqual([]);
  });

  test('움직임 줄임 전역 규칙이 global.css에 있다', () => {
    const block = read(path.join(SRC, GLOBAL)).match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(block, '움직임 줄임 블록').not.toBeNull();
    expect(block?.[1]).toMatch(/animation-duration/);
    expect(block?.[1]).toMatch(/transition-duration/);
  });

  // 선 파랑(--blue)은 도면의 선·면 색이다. 12px 글씨로는 바탕(--bg)에서 4.39:1이라 4.5:1에 못 미친다. 글씨는 링크 파랑(--link)을 쓴다.
  test('글씨 색(color)으로 선 파랑(--blue)을 쓰지 않는다', () => {
    const offenders = styleFiles.filter((f) => /(?<![-\w])color\s*:\s*var\(--blue\)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  test('모서리 둥글기는 토큰 두 단계와 원형 점만 쓴다', () => {
    const bad = styleFiles.flatMap((f) =>
      [...read(f).matchAll(/border-radius\s*:\s*([^;]+);/g)]
        .map((m) => m[1].trim())
        .filter((v) => !['var(--r-sm)', 'var(--r-md)', '50%'].includes(v))
        .map((v) => `${rel(f)}: ${v}`),
    );
    expect(bad).toEqual([]);
  });
});
