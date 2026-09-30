import { expect, test, type Page } from '@playwright/test';

const hasClass = (page: Page, name: string) =>
  page.evaluate((n) => document.documentElement.classList.contains(n), name);

const hiddenReveals = (page: Page) =>
  page
    .locator('[data-reveal]')
    .evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) < 1).map((e) => e.outerHTML.slice(0, 80)));

async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1200);
}

test.describe('움직임 켬(데스크톱 기본)', () => {
  test('js·motion 클래스가 붙고 준비 표시가 뜬다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    expect(await hasClass(page, 'js')).toBe(true);
    expect(await hasClass(page, 'motion')).toBe(true);
  });

  test('끝까지 스크롤하면 숨겨졌던 요소가 모두 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    expect(await hiddenReveals(page)).toEqual([]);
  });

  test('진행 막대가 스크롤에 따라 늘어난다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const scale = () =>
      page.locator('[data-progress-bar]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(await scale()).toBeLessThan(0.05);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(scale).toBeGreaterThan(0.95);
  });

  test('장 목차가 홈의 각 장으로 이어진다', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('[data-chapter-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(['/#ml', '/#agent-product', '/#experience', '/#contact']);
    for (const href of hrefs) await expect(page.locator(href!.slice(1))).toHaveCount(1);
  });

  // P1-R5: 설계 §9 "움직임 켬 경로: 콘솔 오류가 없다"
  test('불러와서 끝까지 스크롤해도 콘솔 오류가 없다', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    expect(errors).toEqual([]);
  });

  // P1-R8b: 문서 맨 끝의 요소는 맨 아래에서 시작한다. 라우트가 푸터 뒤 body 끝에 [data-reveal] 문단을 더한다.
  test('문서 맨 끝의 요소도 맨 아래까지 스크롤하면 보인다', async ({ page }) => {
    await page.route('/', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        '</body>',
        '<p data-reveal data-testid="last-reveal">마지막 줄</p></body>',
      );
      await route.fulfill({ response, body });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.getByTestId('last-reveal').evaluate((e) => Number(getComputedStyle(e).opacity)))
      .toBe(1);
  });

  // P1-R8b: 첫 화면 안의 요소는 스크롤 없이 보인다. 키 큰 화면이 섹션 머리글을 접힌 선 위로 올린다.
  test('처음 화면 안의 [data-reveal]은 스크롤하지 않아도 보인다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 2000 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const hiddenInFirstView = () =>
      page.locator('[data-reveal]').evaluateAll((els) =>
        els
          .filter((e) => e.getBoundingClientRect().top < window.innerHeight * 0.85)
          .filter((e) => Number(getComputedStyle(e).opacity) < 1)
          .map((e) => e.outerHTML.slice(0, 80)),
      );
    await expect.poll(hiddenInFirstView, { timeout: 5000 }).toEqual([]);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  // P1-R13b: 키보드 초점이 닿은 숨은 요소는 CSS :focus-within 규칙으로 스크롤 없이 보인다.
  // 라우트가 맨 아래에 탐침 블록을 더한다. 불러온 직후에는 아직 나타나지 않은 상태다.
  test('키보드 초점이 닿은 숨은 요소는 스크롤 없이도 바로 보인다', async ({ page }) => {
    await page.route('/', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        '</body>',
        '<p data-reveal data-testid="focus-probe"><a href="#content">초점 확인</a></p></body>',
      );
      await route.fulfill({ response, body });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const probe = page.getByTestId('focus-probe');
    const opacity = () => probe.evaluate((e) => Number(getComputedStyle(e).opacity));
    expect(await opacity()).toBe(0);
    await probe.locator('a').evaluate((a) => (a as HTMLElement).focus({ preventScroll: true }));
    await expect.poll(opacity).toBe(1);
  });

  // P1-R10: 폭이 768px 경계를 넘어도 숨은 요소가 남지 않는다.
  test('폭이 768px 경계를 넘어도 숨은 요소가 남지 않는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollThrough(page);
    expect(await hiddenReveals(page)).toEqual([]);
  });

  // P1-R10: 보는 중에 움직임 줄임을 켜면 최종 상태가 바로 보인다.
  test('보는 중에 움직임 줄임을 켜면 모든 내용이 바로 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => hasClass(page, 'motion')).toBe(false);
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

test.describe('움직임 줄임', () => {
  test.use({ reducedMotion: 'reduce' });

  test('motion 클래스가 없고 내용이 처음부터 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    expect(await hasClass(page, 'js')).toBe(true);
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

// P1-R6: 운영 코드에 시험용 훅을 두지 않고 시작 실패를 만든다.
test.describe('연출 시작 실패', () => {
  test('연출이 시작하다 실패하면 움직임을 끄고 내용을 모두 보인다', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        get: () => ({ ready: Promise.reject(new Error('테스트: 연출 시작 실패')) }),
      });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'failed');
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hasClass(page, 'motion-failed')).toBe(true);
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

test.describe('자바스크립트 없음', () => {
  test.use({ javaScriptEnabled: false });

  test('js 클래스가 없고 내용이 모두 보인다', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.className)).not.toContain('js');
    await expect(page.locator('h1')).toBeVisible();
    expect(await hiddenReveals(page)).toEqual([]);
  });
});
