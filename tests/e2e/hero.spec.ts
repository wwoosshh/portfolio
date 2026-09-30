import { expect, test } from '@playwright/test';
import { hero } from '../../src/data/hero';

test.describe('히어로(움직임 줄임: 최종 상태)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('실행 수, 실제 두 결과, 판정, 이슈 링크가 처음부터 보인다', async ({ page }) => {
    await page.goto('/');
    const oracle = page.locator('.hero__oracle');
    await expect(oracle).toContainText('약 21,000개 · 45분');
    await expect(oracle).toContainText(hero.sample.eager);
    await expect(oracle).toContainText(hero.sample.compiled);
    await expect(oracle).toContainText('조용한 오답');
    await expect(oracle.locator(`a[href="${hero.sample.url}"]`)).toContainText('↗');
  });
});

test.describe('히어로(움직임 켬)', () => {
  test('연출이 끝나면 불일치가 표시되고 제목 글자가 그대로다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('[data-mismatch]')).toHaveClass(/is-flagged/, { timeout: 5000 });
    await expect(page.locator('[data-count]')).toHaveText('약 21,000', { timeout: 5000 });
    await expect(page.locator('h1')).toHaveText('정확성을 검증하는 AI/ML 시스템 엔지니어');
  });
});
