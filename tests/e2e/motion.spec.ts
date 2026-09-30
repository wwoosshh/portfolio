import { expect, test, type Page } from '@playwright/test';

const hasClass = (page: Page, name: string) =>
  page.evaluate((n) => document.documentElement?.classList.contains(n) ?? false, name);

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
    await expect.poll(() => hiddenReveals(page)).toEqual([]);
  });

  // P1-R14: 짧은 마지막 장(연락처)도 맨 아래에서는 현재 장이 된다.
  test('현재 장이 목차에 표시되고, 맨 아래에서는 연락처가 현재 장이다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#ml').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
    await expect(page.locator('[data-chapter-link="ml"]')).toHaveAttribute('aria-current', 'location');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('[data-chapter-link="contact"]')).toHaveAttribute('aria-current', 'location');
    await expect(page.locator('[aria-current="location"]')).toHaveCount(1);
  });

  // P1-R16: 고정 상단 바가 이동한 섹션 위쪽을 가리지 않는다. scroll-padding과 scroll-margin이 겹치면(114px) 실패한다.
  test('장 링크로 이동하면 섹션 위쪽이 상단 바에 가리지 않는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('[data-chapter-link="experience"]').click();
    const top = () => page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top);
    await expect.poll(top).toBeLessThan(90);
    expect(await top()).toBeGreaterThanOrEqual(56);
  });

  // P1-R16: 상세 페이지에는 section[id]가 없으므로 건너뛰기 링크의 도착점도 루트의 scroll-padding이 맡는다.
  test('상세 페이지에서 본문 건너뛰기를 하면 본문이 상단 바에 가리지 않는다', async ({ page }) => {
    await page.goto('/projects/asahi/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    expect(await page.locator('#content').evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(56);
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

// P1-R6d: 실패 처리는 되돌리기가 성공하는 데 기대지 않는다. 운영 코드에 훅을 두지 않고, 초기화 스크립트가
// 페이지 주 세계의 Document.prototype을 고친다(Playwright 선택자는 격리된 세계에서 돌아 영향받지 않는다).
test.describe('연출 실패 중 되돌리기도 실패', () => {
  test('되돌리기가 실패해도 움직임을 끄고 내용을 보인다', async ({ page }) => {
    await page.addInitScript(() => {
      const qs = Document.prototype.querySelector;
      const qsa = Document.prototype.querySelectorAll;
      Document.prototype.querySelector = function (this: Document, sel: string) {
        if (sel === '[data-progress-bar]') throw new Error('테스트: 상단 바 실패');
        return qs.call(this, sel);
      } as typeof qs;
      Document.prototype.querySelectorAll = function (this: Document, sel: string) {
        if (sel === '[data-reveal-claimed]') throw new Error('테스트: 되돌리기 실패');
        return qsa.call(this, sel);
      } as typeof qsa;
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'failed');
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hasClass(page, 'motion-failed')).toBe(true);
    expect(await hiddenReveals(page)).toEqual([]);
  });

  test('되돌리기가 인라인 상태를 남겨도 실패한 방문에서는 내용이 보인다', async ({ page }) => {
    await page.addInitScript(() => {
      const qs = Document.prototype.querySelector;
      Document.prototype.querySelector = function (this: Document, sel: string) {
        if (sel === '[data-progress-bar]') throw new Error('테스트: 상단 바 실패');
        return qs.call(this, sel);
      } as typeof qs;
      const remove = CSSStyleDeclaration.prototype.removeProperty;
      let thrown = false;
      CSSStyleDeclaration.prototype.removeProperty = function (this: CSSStyleDeclaration, name: string) {
        if (!thrown && document.documentElement.dataset.motion === 'failed') {
          thrown = true;
          throw new Error('테스트: 인라인 스타일 되돌리기 실패');
        }
        return remove.call(this, name);
      };
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'failed');
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

// P1-R6c: 3초 대체 동작은 "연출 스크립트가 시작하지 못함"만 맡는다. 글꼴은 최대 1초만 기다린다.
test.describe('느린 글꼴', () => {
  test('글꼴이 늦어도 오래 기다리지 않고 연출을 시작한다', async ({ page }) => {
    await page.addInitScript(() => {
      const late = new Promise((resolve) => setTimeout(resolve, 4500));
      Object.defineProperty(document, 'fonts', { configurable: true, get: () => ({ ready: late }) });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready', { timeout: 2500 });
    await page.waitForTimeout(3500); // 3초 대체 동작과 늦은 글꼴 도착을 모두 지난 뒤
    expect(await hasClass(page, 'motion-failed')).toBe(false);
    expect(await hasClass(page, 'motion')).toBe(true);
  });
});

test.describe('늦은 연출 스크립트', () => {
  test('스크립트가 3초 안에 시작하지 못하면 내용을 보이고, 늦게 시작해도 다시 숨기지 않는다', async ({ page }) => {
    await page.route('**/_astro/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'commit' });
    await expect.poll(() => hasClass(page, 'motion-failed'), { timeout: 6000 }).toBe(true);
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hiddenReveals(page)).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'fallback', { timeout: 8000 });
    expect(await hasClass(page, 'motion')).toBe(false);
    expect(await hiddenReveals(page)).toEqual([]);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => page.locator('[data-progress-bar]').evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a))
      .toBeGreaterThan(0.95);
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

// P1-R17: 전역 제약 "인쇄 페이지와 PDF에는 움직임 스크립트를 싣지 않는다".
test('인쇄 페이지는 움직임 스크립트를 싣지 않는다', async ({ request }) => {
  const html = await (await request.get('/print/')).text();
  expect(html).not.toMatch(/<script\b/);
});

// P1-R17: 좁은 폭에서 처음부터 열어도(lite) 끝까지 스크롤하면 모두 보이고, 목차 링크는 24px 이상이다(WCAG 2.5.8).
test.describe('모바일 폭(lite)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('처음부터 좁은 폭으로 열어도 끝까지 스크롤하면 모두 보이고, 목차 링크는 24px 이상이다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    expect(await hiddenReveals(page)).toEqual([]);
    const boxes = await page
      .locator('[data-chapter-link]')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })));
    for (const box of boxes) {
      expect(box.w).toBeGreaterThanOrEqual(24);
      expect(box.h).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('새로 고침(모바일 폭, 스크롤 위치 복원)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('아래까지 본 뒤 새로 고쳐도 오류 없이 모두 보인다', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await scrollThrough(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.evaluate(() => window.scrollTo(0, 0));
    await scrollThrough(page);
    expect(errors).toEqual([]);
    expect(await hiddenReveals(page)).toEqual([]);
  });
});

// 읽던 자리: 모드가 바뀌어도(새 모드의 ScrollTrigger가 만들어지며 스크롤 기억이 지워진다, OI-1) 새로 고쳐도(브라우저는 고정 여백이 없는 문서 기준으로 복원한다, OI-1b) 읽던 장이 상단 바 아래에 그대로 있다.
test.describe('읽던 자리 지키기', () => {
  const topOf = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
  /**
   * 장의 위쪽이 고정 상단 바(57px) 바로 아래에 오도록 스크롤하고, 두 프레임을 기다려 읽던 곳 기록이 따라오게 한다.
   * 스크롤 직후 같은 프레임에 모드가 바뀌는 일은 사람에게는 없다(프레임 하나 분량만 어긋난다).
   */
  const readAt = async (page: Page, id: string) => {
    await page.locator(`#${id}`).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 57));
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expectAtTop(page, id);
  };
  /** 장이 상단 바 바로 아래(0~150px)에 있다. 벗어나면 실제 위치를 보여 준다. */
  const expectAtTop = (page: Page, id: string) =>
    expect
      .poll(async () => {
        const top = await topOf(page, id);
        return top >= 0 && top < 150 ? 'top' : Math.round(top);
      }, { message: `#${id}의 위쪽이 상단 바 아래에 있어야 한다` })
      .toBe('top');
  const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');

  test.describe('움직임 켬(1280×800)', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('읽던 중 폭이 좁아져 lite가 되어도 읽던 장이 상단 바 아래에 있다', async ({ page }) => {
      await page.goto('/');
      await ready(page);
      await readAt(page, 'experience');
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('.pin-spacer')).toHaveCount(0); // lite로 바뀌었다
      await expectAtTop(page, 'experience');
    });

    test('덱 아래(기술 스택)를 읽다 새로 고쳐도 그 자리에 있다', async ({ page }) => {
      await page.goto('/');
      await ready(page);
      await readAt(page, 'skills');
      await page.reload();
      await ready(page);
      await expectAtTop(page, 'skills');
    });

    test('해시(/#experience)로 열어 기술 스택까지 읽다 새로 고치면 해시 자리로 되돌아가지 않는다', async ({ page }) => {
      await page.goto('/#experience');
      await ready(page);
      await readAt(page, 'skills');
      await page.reload();
      await ready(page);
      await expectAtTop(page, 'skills');
    });

    test('다른 페이지에 갔다가 뒤로 돌아와도 읽던 자리에 있다', async ({ page }) => {
      await page.goto('/');
      await ready(page);
      await readAt(page, 'skills');
      await page.goto('/projects/asahi/');
      await page.goBack();
      await ready(page);
      await expectAtTop(page, 'skills');
    });
  });

  test.describe('움직임 줄임으로 열어 켬으로 바꿈', () => {
    test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

    test('줄임을 끄고 full이 되어도 읽던 장이 상단 바 아래에 있다', async ({ page }) => {
      await page.goto('/');
      await ready(page);
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      await readAt(page, 'experience');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(page.locator('.pin-spacer')).toHaveCount(1); // full로 바뀌어 덱이 고정됐다
      await expectAtTop(page, 'experience');
    });
  });
});
