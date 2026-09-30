// 사용법: node scripts/make-pdf.mjs            → public/portfolio.pdf (공개용, 전화번호 없음)
//         node scripts/make-pdf.mjs --private  → ../private/ 에 제출용 PDF (전화번호 포함, 저장소 밖)
// 먼저 astro build가 끝나 있어야 한다(npm run pdf / npm run pdf:private가 빌드까지 한다).
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import { PDFDocument } from 'pdf-lib';

const root = fileURLToPath(new URL('..', import.meta.url));
const privateDir = path.resolve(root, '..', 'private');
const isPrivate = process.argv.includes('--private');
const MAX_PAGES = 4;

async function readPhone() {
  const file = path.join(privateDir, 'contact.json');
  if (!existsSync(file)) {
    throw new Error(`제출용 PDF에는 ${file} 가 필요합니다. 형식: {"phone": "010-0000-0000"}`);
  }
  const raw = await readFile(file, 'utf8');
  const { phone } = JSON.parse(raw.replace(/^\uFEFF/, '')); // 메모장 등이 붙이는 BOM을 허용한다
  if (typeof phone !== 'string' || !/^01[016789]-\d{3,4}-\d{4}$/.test(phone)) {
    throw new Error('contact.json의 phone은 010-0000-0000 형식이어야 합니다.');
  }
  return phone;
}

const server = await preview({ root, server: { port: 4399 } });
try {
  const browser = await chromium.launch();
  let pdf;
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${server.port}/print/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    if (isPrivate) {
      const phone = await readPhone();
      await page.evaluate((value) => {
        const slot = document.querySelector('[data-private-slot="phone"]');
        if (!slot) throw new Error('전화번호 칸(data-private-slot="phone")이 없습니다.');
        slot.textContent = value;
        slot.removeAttribute('hidden');
      }, phone);
    }

    pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }

  const pages = (await PDFDocument.load(pdf)).getPageCount();
  if (pages > MAX_PAGES) throw new Error(`PDF가 ${pages}장입니다. 최대 ${MAX_PAGES}장이어야 합니다.`);

  const out = isPrivate
    ? path.join(privateDir, '우성현_포트폴리오_제출용.pdf')
    : path.join(root, 'public', 'portfolio.pdf');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, pdf);
  console.log(`저장: ${out} (${pages}장)`);
} finally {
  await server.stop();
}
