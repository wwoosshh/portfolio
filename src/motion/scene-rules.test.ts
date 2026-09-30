import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const DIR = fileURLToPath(new URL('./scenes', import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

/** 문자열은 그대로 두고 한 줄 주석과 블록 주석만 지운다. 주석 속의 once:·autoAlpha 설명이 규칙을 잘못 깨지 않게 한다. */
const STRIP = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
const code = (src: string) => src.replace(STRIP, (_all, literal?: string) => literal ?? '');
const read = (f: string) => code(readFileSync(path.join(DIR, f), 'utf8'));

/** once 옵션을 쓰는 모든 표기: once: / 'once': / "once": / 축약 { once } · { a, once, b }. */
const ONCE = /(?<![\w$.])once\s*:|['"]once['"]\s*:|[{,]\s*once\s*[,}]/;
const AUTO_ALPHA = /autoAlpha/;

describe('장면 규칙', () => {
  test('검사할 장면 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)('%s: 한 번 재생은 playOnEnter로만 한다(once 트리거를 애니메이션에 묶지 않는다, P1-R28)', (f) => {
    expect(read(f)).not.toMatch(ONCE);
  });

  test.each(files)('%s: autoAlpha를 쓰지 않는다(숨은 동안에도 초점·보조 기술이 닿게, P1-R9)', (f) => {
    expect(read(f)).not.toMatch(AUTO_ALPHA);
  });
});

// 규칙을 검사하는 도구가 실제로 잡아내는지 확인한다(항상 통과하는 검사를 막는다).
describe('장면 규칙 검사기', () => {
  test.each([
    ['once: true', 'ScrollTrigger.create({ trigger: el, once: true })'],
    ['따옴표 once', "{ 'once': true }"],
    ['큰따옴표 once', '{ "once" : true }'],
    ['축약 { once }', 'const once = true; ScrollTrigger.create({ once })'],
    ['축약 뒤에 다른 키', 'ScrollTrigger.create({ once, start: 0 })'],
    ['축약 앞에 다른 키', 'ScrollTrigger.create({ start: 0, once })'],
    ['주석 뒤 같은 줄', 'const a = 1; /* 설명 */ ScrollTrigger.create({ once: true })'],
  ])('once를 잡는다: %s', (_name, src) => {
    expect(code(src)).toMatch(ONCE);
  });

  test.each([
    ['// 주석 속 once:', '// once: true는 쓰지 않는다\nconst a = 1;'],
    ['/* */ 주석 속 once:', '/* playOnEnter가 once: true를 맡는다 */ const a = 1;'],
    ['여러 줄 주석 속 { once }', '/**\n * { once } 대신\n */\nconst a = 1;'],
    ['다른 식별자', 'const onceDone = false; const nonce: string = "x"; run({ nonce })'],
    ['속성 접근', 'el.once = 1; obj.once(() => {})'],
  ])('once를 잘못 잡지 않는다: %s', (_name, src) => {
    expect(code(src)).not.toMatch(ONCE);
  });

  test('문자열 속의 //는 주석으로 지우지 않는다', () => {
    expect(code("const url = 'http://x'; run({ once: true })")).toMatch(ONCE);
  });

  test('autoAlpha를 잡되 주석 속 설명은 넘긴다', () => {
    expect(code('gsap.to(el, { autoAlpha: 1 })')).toMatch(AUTO_ALPHA);
    expect(code('// autoAlpha는 쓰지 않는다\nconst a = 1;')).not.toMatch(AUTO_ALPHA);
  });
});
