import { expect, test } from '@playwright/test';

test('마무리: 큰 마무리 문장과 이메일·GitHub·PDF가 있다', async ({ page }) => {
  await page.goto('/');
  const closing = page.locator('#contact');
  await expect(closing.locator('.closing__line')).toHaveText('끝까지 봐 주셔서 감사합니다.');
  await expect(closing.locator('a[href="mailto:nunconnect1@gmail.com"]').first()).toBeVisible();
  await expect(closing.locator('a[href="https://github.com/wwoosshh"]').first()).toBeVisible();
  await expect(closing.locator('a[href="/portfolio.pdf"]')).toHaveAttribute('download', '우성현_포트폴리오.pdf');
});

test.describe('카드 기울기(움직임 켬)', () => {
  test('마우스를 올리면 기울고 벗어나면 돌아온다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const card = page.locator('#more [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await card.boundingBox();
    if (!box) throw new Error('카드가 보이지 않습니다');
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');
    await page.mouse.move(0, 0);
    await expect
      .poll(() => card.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.abs(m.m13) + Math.abs(m.m23); }), { timeout: 3000 })
      .toBeLessThan(0.01);
  });
});

test.describe('카드 기울기(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('마우스를 올려도 기울지 않는다', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#more [data-tilt]').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(500);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});
