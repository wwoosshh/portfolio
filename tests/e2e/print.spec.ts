import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { profile } from '../../src/data/profile';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

test('인쇄 페이지는 A4 4장 이하 PDF가 된다', async ({ page }) => {
  await page.goto('/print/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const doc = await PDFDocument.load(pdf);
  expect(doc.getPageCount()).toBeLessThanOrEqual(4);
});

test('인쇄 페이지는 검색 엔진 색인을 막는다', async ({ page }) => {
  await page.goto('/print/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

// 사이트 주소(profile.contact.site)는 배포 뒤에 정해진다. 있으면 각주에도 같은 주소를 적는다.
test('인쇄 페이지의 각주는 웹 포트폴리오를 가리키고, 사이트 주소가 있으면 함께 적는다', async ({ page }) => {
  const host = profile.contact.site?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  await page.goto('/print/');
  await expect(page.locator('.footnote')).toContainText(
    host ? `웹 포트폴리오(${host})에서 확인할 수 있습니다.` : '웹 포트폴리오에서 확인할 수 있습니다.',
  );
});

test('공개 빌드의 전화번호 칸은 비어 있고 숨겨져 있다', async ({ page }) => {
  await page.goto('/print/');
  const slot = page.locator('[data-private-slot="phone"]');
  await expect(slot).toHaveCount(1);
  await expect(slot).toBeHidden();
  await expect(slot).toHaveText('');
});

test('공개 페이지 어디에도 전화번호 형식 문자열이 없다', async ({ page, request }) => {
  await page.goto('/');
  const details = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  for (const path of ['/', '/print/', ...details]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toMatch(PHONE);
  }
});

test('모든 내부 링크가 200으로 응답한다', async ({ page, request }) => {
  const queue = ['/'];
  const seen = new Set<string>();
  const bad: string[] = [];
  while (queue.length > 0) {
    const path = queue.pop() as string;
    if (seen.has(path)) continue;
    seen.add(path);
    const response = await request.get(path);
    if (response.status() !== 200) {
      bad.push(`${response.status()} ${path}`);
      continue;
    }
    if (!(response.headers()['content-type'] ?? '').includes('text/html')) continue;
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href') as string));
    for (const href of hrefs) {
      const clean = href.split('#')[0];
      if (clean && !seen.has(clean)) queue.push(clean);
    }
  }
  expect(bad).toEqual([]);
});
