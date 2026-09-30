import { expect, test } from '@playwright/test';

test.describe('2장 가로 구간(데스크톱, 움직임 켬)', () => {
  test('장면이 고정되고 건너뛰기가 구간 뒤로 옮긴다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('.deck')).toHaveAttribute('data-pinned', '');
    await expect(page.locator('.pin-spacer .deck')).toHaveCount(1);
    await page.evaluate(() => document.querySelector('.deck')?.scrollIntoView());
    await page.waitForTimeout(300);
    await page.locator('[data-deck-skip]').click();
    await expect
      .poll(() => page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top))
      .toBeLessThan(await page.evaluate(() => window.innerHeight));
  });

  test('펼친 슬라이드의 폭은 보이는 폭과 같다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const { widths, visible, scrollbar } = await page.evaluate(() => ({
      widths: Array.from(document.querySelectorAll<HTMLElement>('.deck__slide')).map((s) => s.offsetWidth),
      visible: document.querySelector<HTMLElement>('.deck__viewport')!.clientWidth,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
    }));
    for (const w of widths) expect(Math.abs(w - visible)).toBeLessThanOrEqual(1);
    test.info().annotations.push({ type: 'scrollbar', description: String(scrollbar) });
  });

  test('키보드 초점이 화면 밖 슬라이드로 가면 그 슬라이드가 보이게 넘어간다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const last = page.locator('.deck__slide').last();
    await last.locator('a[data-detail-link]').focus();
    await expect
      .poll(async () => Math.abs((await last.boundingBox())?.x ?? 9999), { timeout: 4000 })
      .toBeLessThan(40);
    expect(await page.locator('.deck__viewport').evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('깊은 링크(/#experience)로 바로 열어도 그 섹션이 상단 바 바로 아래에 온다', async ({ page }) => {
    await page.goto('/#experience');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const top = () => page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top);
    await expect.poll(top, { timeout: 4000 }).toBeLessThan(120);
    expect(await top()).toBeGreaterThanOrEqual(50);
  });
});

test.describe('2장 가로 구간(모바일)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('고정 없이 세로로 쌓이고 건너뛰기는 숨는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('[data-deck-skip]')).toBeHidden();
  });
});

test.describe('2장 도면(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('슬라이드 4개가 도면·상태·근거와 함께 보인다', async ({ page }) => {
    await page.goto('/');
    const slides = page.locator('#agent-product .deck__slide');
    await expect(slides).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const svg = slides.nth(i).locator('svg.dg[role="img"]');
      await expect(svg).toHaveCount(1);
      await expect(svg.locator('title')).not.toHaveText('');
      expect(await slides.nth(i).locator('.evidence').count()).toBeGreaterThan(0);
    }
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
  });
});
