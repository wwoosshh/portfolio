import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const inDir = (dir: string, ok: (f: string) => boolean) =>
  readdirSync(path.join(SRC, dir))
    .filter(ok)
    .map((f) => path.join(SRC, dir, f));
const files = [
  ...inDir('content/projects', (f) => f.endsWith('.mdx')),
  ...inDir('data', (f) => f.endsWith('.ts') && !f.endsWith('.test.ts')),
];
const ANCHORED = /https:\/\/github\.com\/[^/\s"'`)]+\/[^/\s"'`)]+\/blob\/([^/\s"'`)]+)\/[^\s"'`)#]*#L\d+/g;

describe('근거 링크', () => {
  test('줄 번호가 붙은 GitHub 링크는 커밋 SHA로 고정한다', () => {
    const found = files.flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(ANCHORED)].map((m) => ({ file: path.relative(SRC, f), url: m[0], ref: m[1] })),
    );
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((l) => !/^[0-9a-f]{40}$/.test(l.ref)).map((l) => `${l.file}: ${l.url}`)).toEqual([]);
  });

  // 사이트에서 링크하지 않는 저장소
  test('링크하지 않는 저장소를 가리키지 않는다', () => {
    const UNLINKED = [`wwoosshh/${['foodiemap', 'backend'].join('-')}`];
    const offenders = files.flatMap((f) => {
      const text = readFileSync(f, 'utf8');
      return UNLINKED.filter((repo) => text.includes(repo)).map((repo) => `${path.relative(SRC, f)}: ${repo}`);
    });
    expect(offenders).toEqual([]);
  });
});
