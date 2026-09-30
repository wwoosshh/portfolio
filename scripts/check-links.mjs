// dist/의 모든 HTML에서 외부 링크를 모아 응답을 확인한다. 먼저 npm run build.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

const urls = new Set();
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) urls.add(m[1].replaceAll('&amp;', '&'));
}

async function check(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
        headers: { 'user-agent': 'portfolio-link-check' },
      });
      return { url, status: res.status };
    } catch (error) {
      if (attempt === 2) return { url, status: 0, error: String(error) };
    }
  }
}

const queue = [...urls];
const results = [];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length > 0) results.push(await check(queue.shift()));
  }),
);

results.sort((a, b) => a.url.localeCompare(b.url));
for (const r of results) console.log(`${String(r.status || 'ERR').padEnd(4)} ${r.url}`);
const warn = results.filter((r) => r.status === 429);
const bad = results.filter((r) => r.status !== 429 && (r.status < 200 || r.status >= 400));
if (warn.length > 0) console.warn(`\n경고: 요청 제한(429) ${warn.length}개. 잠시 뒤 다시 실행해 확인하세요.`);
if (bad.length > 0) {
  console.error(`\n깨진 링크 ${bad.length}개`);
  process.exit(1);
}
console.log(`\n외부 링크 ${results.length}개 확인 완료`);
