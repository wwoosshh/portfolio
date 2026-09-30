import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const DIR = fileURLToPath(new URL('./scenes', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const read = (f: string) => readFileSync(path.join(DIR, f), 'utf8');

describe('장면 규칙', () => {
  test('검사할 장면 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)('%s: 한 번 재생은 playOnEnter로만 한다(once 트리거를 애니메이션에 묶지 않는다, P1-R28)', (f) => {
    expect(read(f)).not.toMatch(/\bonce\s*:/);
  });

  test.each(files)('%s: autoAlpha를 쓰지 않는다(숨은 동안에도 초점·보조 기술이 닿게, P1-R9)', (f) => {
    expect(read(f)).not.toMatch(/autoAlpha/);
  });
});
