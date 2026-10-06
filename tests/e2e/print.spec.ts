import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import raw from '../../src/data/contributions.json' with { type: 'json' };
import { profile } from '../../src/data/profile';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

// 건수는 매일 바뀐다. 기대값은 기여 데이터(JSON)에서 읽고, 숫자를 적지 않는다.
const STATUS_WORDS = ['병합됨', '승인 · 병합 대기', '리뷰 중', '변경 요청', '닫힘', '해결됨', '분류됨', '열림'];
const RELATED_WORDS = ['병합됨', '닫힘', '리뷰 대기'];
const KIND = { pr: 'PR', issue: '이슈' } as const;
const SHORT = new Map([
  ['pytorch/pytorch', 'PyTorch'],
  ['vllm-project/vllm', 'vLLM'],
  ['sgl-project/sglang', 'SGLang'],
  ['Comfy-Org/ComfyUI', 'ComfyUI'],
]);
type Related = { number: number; url: string };
const relatedOf = (c: (typeof raw.items)[number]): Related[] => (c as { related?: Related[] }).related ?? [];

test('인쇄 페이지는 A4 4장 이하 PDF가 된다', async ({ page }) => {
  await page.goto('/print/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const doc = await PDFDocument.load(pdf);
  expect(doc.getPageCount()).toBeLessThanOrEqual(4);
});

test('인쇄: 외부 기여 표는 항목마다 한 행이고 저장소·종류 #번호·상태 글자·제목을 가진다', async ({ page }) => {
  await page.goto('/print/');
  const rows = page.locator('.print .ctable tbody tr');
  await expect(rows).toHaveCount(raw.items.length);
  await expect(rows.first().locator('td').first()).toHaveText('PyTorch');
  for (const c of raw.items) {
    const row = rows.filter({ has: page.locator(`a[href="${c.url}"]`) });
    await expect(row, c.url).toHaveCount(1);
    await expect(row.locator('td').nth(0), c.url).toHaveText(SHORT.get(c.repo) ?? c.repo.split('/')[1]);
    await expect(row.locator('td').nth(1), c.url).toHaveText(`${KIND[c.kind as 'pr' | 'issue']} #${c.number}`);
    await expect(row.locator('td').nth(2), c.url).toHaveText(new RegExp(STATUS_WORDS.join('|')));
    await expect(row.locator('.ctable__title'), c.url).toHaveText(c.title);
  }
});

test('인쇄: 다른 개발자의 수정 PR은 같은 행에 `다른 개발자 수정 PR #번호 (상태)`로 들어 있다', async ({ page }) => {
  await page.goto('/print/');
  const withRelated = raw.items.filter((c) => relatedOf(c).length > 0);
  expect(withRelated.length).toBeGreaterThan(0);
  for (const c of withRelated) {
    const row = page.locator('.print .ctable tbody tr').filter({ has: page.locator(`a[href="${c.url}"]`) });
    for (const r of relatedOf(c)) {
      await expect(row.locator(`a[href="${r.url}"]`), r.url).toHaveCount(1);
      const text = await row.innerText();
      const phrases = RELATED_WORDS.map((word) => `다른 개발자 수정 PR #${r.number} (${word})`);
      expect(
        phrases.some((phrase) => text.includes(phrase)),
        `${r.url}: ${text}`,
      ).toBe(true);
    }
  }
});

test('인쇄: 표 아래에 매일 자동 확인과 마지막 변경 날짜가 있다', async ({ page }) => {
  await page.goto('/print/');
  await expect(page.locator('.print .asof')).toHaveText(`매일 자동 확인 · 마지막 변경 ${raw.asOf.slice(0, 10)}`);
});

test('인쇄: 오픈소스가 개인 프로젝트보다 먼저 나오고, 끝에 있던 외부 기여 목록은 없다', async ({ page }) => {
  await page.goto('/print/');
  const headings = (await page.locator('.print h2').allInnerTexts()).map((t) => t.trim());
  const order = ['오픈소스 · 외부 프로젝트 기여', '오픈소스 · 직접 운영하는 프로젝트', '개인 프로젝트', '그 밖의 프로젝트', '기술 스택'];
  expect(headings.filter((h) => order.includes(h))).toEqual(order);
  expect(headings.filter((h) => h.startsWith('외부 기여'))).toEqual([]);
  await expect(page.locator('.print .contribs')).toHaveCount(0);
  const briefs = await page.locator('.print .brief').evaluateAll((els) => els.map((e) => e.getAttribute('data-project')));
  expect(briefs).toEqual(['entail', 'torch-compile-fuzzer', 'geul-lang', 'inversa-bench', 'asahi', 'barun-order', 'mzcube', 'nogada-rpg']);
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
