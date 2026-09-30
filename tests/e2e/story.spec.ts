import { expect, test } from '@playwright/test';
import { profile } from '../../src/data/profile';

test.describe('경력·일하는 방식(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('타임라인 항목과 흐름도, 원칙, 근거 링크가 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#experience .timeline__item')).toHaveCount(4);
    const flow = page.locator('#how-i-work svg.dg[role="img"]');
    await expect(flow).toHaveCount(1);
    for (const step of ['설계 문서', '구현 계획', '테스트 먼저', '구현', '측정·검증']) {
      await expect(flow).toContainText(step);
    }
    await expect(page.locator('#how-i-work .principle')).toHaveCount(profile.howIWork.principles.length);
    await expect(page.locator('#how-i-work .evidence-list a[target="_blank"]')).toHaveCount(profile.howIWork.evidence.length);
  });

  // 흐름도는 좁은 화면에서 옆으로 스크롤된다. 키보드로 닿고 이름이 있어야 한다.
  test('흐름도 영역은 키보드가 닿고 이름이 있다', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#how-i-work .how__flow');
    await expect(panel).toHaveAttribute('tabindex', '0');
    await expect(panel).toHaveAccessibleName('작업 흐름도(가로로 스크롤)');
    await panel.focus();
    await expect(panel).toBeFocused();
  });
});

test.describe('경력 타임라인(움직임 켬)', () => {
  test('스크롤하면 진행선이 끝까지 그려진다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#experience').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await expect
      .poll(() => page.locator('.timeline__progress').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d), { timeout: 5000 })
      .toBeGreaterThan(0.95);
  });
});
