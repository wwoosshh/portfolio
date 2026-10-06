import { expect, test } from '@playwright/test';

test.describe('1장(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('간지 제목과 직접 운영하는 오픈소스 5개의 수치 패널이 근거와 함께 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#oss-title')).toHaveText('오픈소스');
    const scenes = page.locator('#oss article[data-project]');
    await expect(scenes).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const metrics = scenes.nth(i).locator('.pscene__metric');
      expect(await metrics.count()).toBeGreaterThan(0);
      for (let j = 0; j < (await metrics.count()); j++) {
        await expect(metrics.nth(j).locator('.evidence')).toHaveCount(1);
      }
    }
  });
});

test.describe('장 간지(움직임 켬)', () => {
  test('스크롤해 지나가면 간지가 3D 전환을 마치고 평면으로 선다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#oss').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await expect
      .poll(() => page.locator('#oss-title').evaluate((el) => getComputedStyle(el).transform), { timeout: 5000 })
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
});
