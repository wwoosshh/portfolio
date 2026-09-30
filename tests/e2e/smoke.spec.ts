import { expect, test } from '@playwright/test';

test('홈이 한국어 문서로 열린다', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page).toHaveTitle(/우성현/);
});

test('대표 주소(canonical)와 og:url은 배포 주소다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://portfolio-nu-taupe-66.vercel.app/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://portfolio-nu-taupe-66.vercel.app/');
  await page.goto('/projects/entail/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://portfolio-nu-taupe-66.vercel.app/projects/entail/',
  );
});
