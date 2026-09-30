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

// P1-R19: 좁은 폭(lite)에서는 접힌 선 아래에서 판정 장면이 혼자 끝나 버리지 않고, 결과 행이 보일 때 재생한다.
// 390x664는 브라우저 막대가 있는 폰의 보이는 높이다. 결과 행은 이 높이의 80% 선 아래에 있다.
test.describe('히어로(모바일 폭: 판정 장면은 보일 때 재생)', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('판정 행이 화면에 들어오기 전에는 흔들림·판정이 일어나지 않고, 들어오면 일어난다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-mismatch]')).not.toHaveClass(/is-flagged/);
    await page.locator('.hero__rows').evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(page.locator('[data-mismatch]')).toHaveClass(/is-flagged/, { timeout: 4000 });
    await expect(page.locator('[data-count]')).toHaveText('약 21,000', { timeout: 5000 });
  });
});

// P1-R10: 연출 도중 모드가 바뀌어도 나눈 제목·판정 표시가 남지 않고 최종 상태로 돌아간다.
test.describe('히어로(연출 도중 움직임 줄임으로 바뀜)', () => {
  test('최종 상태로 돌아가고 나눈 글자·판정 표시가 남지 않는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.waitForTimeout(600);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const h1 = page.locator('h1');
    await expect.poll(() => h1.evaluate((el) => el.querySelectorAll('div').length)).toBe(0);
    expect(await h1.getAttribute('aria-label')).toBeNull();
    await expect(page.locator('[data-mismatch]')).not.toHaveClass(/is-flagged/);
    await expect(page.locator('[data-count]')).toHaveText('약 21,000');
  });

  // 위 시험은 0.6초에 바꾸므로 판정 표시(1.4초에 붙음)는 아직 없다. 표시가 붙은 뒤에 바꿔도 지워지는지 따로 지킨다.
  test('판정 표시가 붙은 뒤에 바꿔도 표시가 남지 않는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await expect(page.locator('[data-mismatch]')).toHaveClass(/is-flagged/, { timeout: 5000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-mismatch]')).not.toHaveClass(/is-flagged/);
    await expect(page.locator('[data-count]')).toHaveText('약 21,000');
  });
});

// P1-R18: 연출 스크립트가 시작하기 전에는 실행 수와 눈금이 최종 값으로 보였다가 되돌아가지 않는다.
test.describe('히어로(스크립트가 시작되기 전)', () => {
  test('실행 수와 눈금은 연출이 시작되기 전까지 최종 값으로 보이지 않는다', async ({ page }) => {
    await page.route('**/_astro/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'commit' });
    const opacity = (sel: string) =>
      page.evaluate((s) => {
        const el = document.querySelector(s);
        return el ? Number(getComputedStyle(el).opacity) : -1;
      }, sel);
    await expect.poll(() => opacity('.hero__count')).toBe(0);
    expect(await opacity('.hero__ticks')).toBe(0);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready', { timeout: 8000 });
    await expect.poll(() => opacity('.hero__count'), { timeout: 5000 }).toBe(1);
  });
});
