// 임시 진단: 인쇄본이 리눅스 CI에서만 5장이 되는 원인을 재기 위한 측정. 원인을 고친 뒤 지운다.
import { PDFDocument } from 'pdf-lib';
import { test } from '@playwright/test';

test('[진단] 인쇄 레이아웃 높이와 축소 비율별 장수', async ({ page }) => {
  await page.goto('/print/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const counts: string[] = [];
  for (const scale of [1, 0.97, 0.94, 0.9]) {
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, scale });
    counts.push(`${scale}:${(await PDFDocument.load(pdf)).getPageCount()}`);
  }
  await page.setViewportSize({ width: 703, height: 1032 });
  await page.emulateMedia({ media: 'print' });
  const m = await page.evaluate(() => {
    const h = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().height) : -1);
    const sections = [...document.querySelectorAll('body.print section')].map((s, i) => `s${i}=${h(s)}`);
    const rows = [...document.querySelectorAll('.ctable tbody tr')].map((r) => h(r));
    const probe = document.createElement('span');
    probe.textContent = '✓';
    probe.style.font = getComputedStyle(document.body).font;
    document.body.append(probe);
    const check = probe.getBoundingClientRect();
    probe.remove();
    return {
      total: document.documentElement.scrollHeight,
      sections: sections.join(' '),
      table: h(document.querySelector('.ctable')),
      rows: rows.join(','),
      check: `${check.width.toFixed(2)}x${check.height.toFixed(2)}`,
      font: getComputedStyle(document.body).fontFamily.slice(0, 60),
    };
  });
  console.log(`[인쇄 진단] pages@scale ${counts.join(' ')} | total=${m.total}px (4쪽=${4 * 1032}px) | ${m.sections} | table=${m.table} rows=${m.rows} | ✓=${m.check}`);
});
