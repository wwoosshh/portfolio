import { expect, test } from '@playwright/test';

test('홈이 한국어 문서로 열린다', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page).toHaveTitle(/우성현/);
});
