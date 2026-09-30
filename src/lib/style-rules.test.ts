import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));

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
    expect(styleFiles.map(rel)).toContain('styles/tokens.css');
  });

  test('그림자를 쓰지 않는다', () => {
    const offenders = styleFiles.filter((f) => /(box|text)-shadow\s*:(?!\s*none)/.test(read(f))).map(rel);
    expect(offenders).toEqual([]);
  });

  test('색 값은 tokens.css에서만 정의한다', () => {
    const offenders = styleFiles
      .filter((f) => rel(f) !== 'styles/tokens.css')
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(read(f).replace(/href="[^"]*"/g, '')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  test('그라데이션은 제목 형광펜 한 곳에서만 쓴다', () => {
    const uses = styleFiles.flatMap((f) => (read(f).match(/linear-gradient\(/g) ?? []).map(() => rel(f)));
    expect(uses).toEqual(['styles/global.css']);
  });

  test('transform·transition·animation을 쓰지 않는다', () => {
    const offenders = styleFiles
      .filter((f) => /(?<![-\w])(transform|transition|animation)\s*:/.test(read(f)))
      .map(rel);
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
