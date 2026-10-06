import { expect, test, type Page } from '@playwright/test';

const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
const experienceTop = (page: Page) => page.locator('#experience').evaluate((el) => el.getBoundingClientRect().top);

test.describe('2장 가로 구간(데스크톱, 움직임 켬)', () => {
  test('장면이 고정되고 건너뛰기가 구간 뒤로 옮긴다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.deck')).toHaveAttribute('data-pinned', '');
    await expect(page.locator('.pin-spacer .deck')).toHaveCount(1);
    await page.evaluate(() => document.querySelector('.deck')?.scrollIntoView());
    await page.waitForTimeout(300);
    await page.locator('[data-deck-skip]').click();
    // 다음 장이 상단 바 바로 아래에 온다(고정 구간 안에 머물지 않고, 너무 지나치지도 않는다).
    await expect.poll(() => experienceTop(page)).toBeLessThan(120);
    expect(await experienceTop(page)).toBeGreaterThanOrEqual(50);
  });

  test('건너뛰기 버튼은 무엇을 건너뛰는지 이름에 밝힌다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('[data-deck-skip]')).toHaveAccessibleName('건너뛰기: 2장 가로 구간');
  });

  // T8-I2: 건너뛰기 뒤에 초점이 버튼에 남으면 다음 Tab이 덱 안으로 돌아가고, 초점 처리가 스크롤을 덱으로 되돌린다.
  test('건너뛰기를 키보드로 누르면 초점이 다음 장으로 옮겨져, 이어서 Tab을 눌러도 덱으로 끌려가지 않는다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await page.locator('[data-deck-skip]').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => experienceTop(page)).toBeLessThan(120);
    expect(await experienceTop(page)).toBeGreaterThanOrEqual(50);
    await expect(page.locator('#experience-title')).toBeFocused();
    const skippedAt = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('.deck') ?? null)).toBeNull();
    // 덱으로 끌려갔다면 스크롤이 크게 되돌아간다. 다음 초점 자리로 더 내려가는 것은 괜찮다.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(skippedAt);
  });

  test('펼친 슬라이드의 폭은 보이는 폭과 같다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const { widths, visible, scrollbar } = await page.evaluate(() => ({
      widths: Array.from(document.querySelectorAll<HTMLElement>('.deck__slide')).map((s) => s.offsetWidth),
      visible: document.querySelector<HTMLElement>('.deck__viewport')!.clientWidth,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
    }));
    for (const w of widths) expect(Math.abs(w - visible)).toBeLessThanOrEqual(1);
    test.info().annotations.push({ type: 'scrollbar', description: String(scrollbar) });
  });

  // 실제 Tab 키로 마지막 슬라이드의 링크까지 간다. 초점 처리는 키보드 초점(:focus-visible)에만 반응한다.
  test('Tab으로 화면 밖 슬라이드의 링크에 닿으면 그 슬라이드가 보이게 넘어간다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const last = page.locator('.deck__slide').last();
    const link = last.locator('a[data-detail-link]');
    await page.locator('[data-deck-skip]').focus();
    for (let presses = 0; presses < 30 && !(await link.evaluate((el) => el === document.activeElement)); presses++) {
      await page.keyboard.press('Tab');
    }
    await expect(link).toBeFocused();
    await expect
      .poll(async () => Math.abs((await last.boundingBox())?.x ?? 9999), { timeout: 4000 })
      .toBeLessThan(40);
    expect(await page.locator('.deck__viewport').evaluate((el) => el.scrollLeft)).toBe(0);
  });

  // 마우스로 누른 링크는 이미 보이는 곳에 있다. 초점 처리가 스크롤을 슬라이드 정렬 위치로 끌어가면 안 된다.
  test('마우스로 슬라이드의 링크를 눌러도 스크롤이 끌려가지 않는다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    // 고정이 막 시작된 자리(진행 40px)에서 첫 슬라이드가 거의 그대로 보인다. 정렬 위치는 진행 0이다.
    const start = await page.evaluate(() => document.querySelector('.pin-spacer')!.getBoundingClientRect().top + window.scrollY - 57);
    await page.evaluate((y) => window.scrollTo(0, y + 40), start);
    const link = page.locator('.deck__slide').first().locator('a[data-detail-link]');
    await expect
      .poll(async () => {
        const first = (await link.boundingBox())?.x ?? 0;
        await page.waitForTimeout(100);
        return Math.abs(first - ((await link.boundingBox())?.x ?? 1));
      })
      .toBeLessThan(0.5); // 스크럽이 멈추길 기다린다
    const box = (await link.boundingBox())!;
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('깊은 링크(/#experience)로 바로 열어도 그 섹션이 상단 바 바로 아래에 온다', async ({ page }) => {
    await page.goto('/#experience');
    await ready(page);
    await expect.poll(() => experienceTop(page), { timeout: 4000 }).toBeLessThan(120);
    expect(await experienceTop(page)).toBeGreaterThanOrEqual(50);
  });
});

// 가로 폰(844×390, 932×430)과 낮은 창(1280×500)은 폭이 768px 이상이라 full이지만, 한 슬라이드가 들어갈 만큼 높지 않다.
// 고정하면 수치·근거·도면이 잘려 나가므로 쌓아서 보여 준다(높이 600px 기준).
test.describe('2장 가로 구간(낮은 화면)', () => {
  const effective = (el: Element) => {
    let opacity = 1;
    for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
    const frame = el.closest('.deck__viewport')!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const inside = r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1 && r.left >= frame.left - 1 && r.right <= frame.right + 1;
    return { opacity, inside };
  };

  for (const [width, height] of [[844, 390], [932, 430], [1280, 500]]) {
    test(`${width}×${height}에서는 고정하지 않고, 모든 슬라이드의 수치·근거·도면이 잘리지 않고 보인다`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await ready(page);
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      await expect(page.locator('.deck')).not.toHaveAttribute('data-pinned');
      await expect(page.locator('[data-deck-skip]')).toBeHidden();
      const slides = page.locator('.deck__slide');
      await expect(slides).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        for (const part of ['.deck__metrics', '.evidence', '.deck__figure']) {
          const el = slides.nth(i).locator(part).first();
          await el.scrollIntoViewIfNeeded();
          await expect
            .poll(() => el.evaluate(effective), { message: `슬라이드 ${i + 1}의 ${part}` })
            .toEqual({ opacity: 1, inside: true });
        }
      }
    });
  }

  test('높이가 600px 밑으로 내려가면 고정이 풀리고, 다시 올라가면 고정된다(읽던 자리는 그대로)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const experienceAtTop = () =>
      expect
        .poll(async () => {
          const top = await experienceTop(page);
          return top >= 0 && top < 150 ? 'top' : Math.round(top);
        })
        .toBe('top');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.deck')).toHaveAttribute('data-pinned', '');
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    // 덱 아래(경력)를 읽는 중에 높이가 바뀌어도 읽던 곳이 그대로다. 두 프레임을 기다려 읽던 곳 기록이 따라오게 한다.
    await page.locator('#experience').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 57));
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await experienceAtTop();
    await page.setViewportSize({ width: 1280, height: 500 });
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('.deck')).not.toHaveAttribute('data-pinned');
    await experienceAtTop();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('.deck')).toHaveAttribute('data-pinned', '');
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await experienceAtTop();
    expect(errors).toEqual([]);
  });
});

test.describe('2장 가로 구간(모바일)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('고정 없이 세로로 쌓이고 건너뛰기는 숨는다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('[data-deck-skip]')).toBeHidden();
  });

  // 도면을 폭에 맞추면 글자가 7px 안팎이 된다. 읽을 만한 폭을 지키고 옆으로 스크롤하며, 그 영역은 이름이 있고 키보드가 닿는다.
  test('도면은 480px 폭을 지키고, 옆으로 스크롤되는 영역은 이름과 초점을 가진다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    const figures = await page.locator('.deck__figure').evaluateAll((els) =>
      els.map((el) => ({
        svg: el.querySelector('svg.dg')!.getBoundingClientRect().width,
        scrolls: el.scrollWidth > el.clientWidth,
        overflowX: getComputedStyle(el).overflowX,
        tabindex: el.getAttribute('tabindex'),
        role: el.getAttribute('role'),
        label: el.getAttribute('aria-label') ?? '',
      })),
    );
    expect(figures).toHaveLength(3);
    for (const f of figures) {
      expect(f.svg).toBeGreaterThanOrEqual(480);
      expect(f).toMatchObject({ scrolls: true, overflowX: 'auto', tabindex: '0', role: 'group' });
      expect(f.label).toContain('구조도');
    }
  });
});

test.describe('2장 도면(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('슬라이드 3개가 도면·상태·근거와 함께 보인다', async ({ page }) => {
    await page.goto('/');
    const slides = page.locator('#personal .deck__slide');
    await expect(slides).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const svg = slides.nth(i).locator('svg.dg[role="img"]');
      await expect(svg).toHaveCount(1);
      await expect(svg.locator('title')).not.toHaveText('');
      expect(await slides.nth(i).locator('.evidence').count()).toBeGreaterThan(0);
    }
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
  });
});
