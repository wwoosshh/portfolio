import { expect, test, type Page } from '@playwright/test';

const WIDTHS = [390, 834, 1280];

async function routes(page: Page): Promise<string[]> {
  await page.goto('/');
  const details = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  return ['/', ...details];
}

for (const width of WIDTHS) {
  test(`폭 ${width}px에서 가로 스크롤과 콘솔 에러가 없다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const path of await routes(page)) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} @${width}`).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

test('제목 계층: h1은 하나이고 단계를 건너뛰지 않는다', async ({ page }) => {
  for (const path of await routes(page)) {
    await page.goto(path);
    const levels = await page.locator('h1, h2, h3, h4').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels.filter((l) => l === 1), path).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `${path}: h${levels[i - 1]} 다음 h${levels[i]}`).toBeLessThanOrEqual(1);
    }
  }
});

test('키보드 포커스가 보인다', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return `${s.outlineStyle} ${s.outlineWidth}`;
  });
  expect(outline).toBe('solid 2px');
});

test('모든 이미지에 대체 텍스트가 있다', async ({ page }) => {
  for (const path of await routes(page)) {
    await page.goto(path);
    const missing = await page.locator('img:not([alt])').count();
    expect(missing, path).toBe(0);
  }
});
