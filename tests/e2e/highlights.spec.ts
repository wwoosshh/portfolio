import { expect, test } from '@playwright/test';
import raw from '../../src/data/contributions.json' with { type: 'json' };
import { profile } from '../../src/data/profile';

test.describe('핵심 성과(움직임 줄임)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('성과마다 큰 숫자·단위·근거가 보인다', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('#highlights .hl__item');
    await expect(items).toHaveCount(profile.highlights.length);
    for (const [i, h] of profile.highlights.entries()) {
      await expect(items.nth(i).locator('[data-figure]')).toHaveText(h.figure.value);
      await expect(items.nth(i)).toContainText(h.figure.unit);
      await expect(items.nth(i).locator('a.evidence')).toHaveCount(1);
    }
  });

  // 큰 숫자와 단위는 flex 줄이라 눈에는 gap으로 벌어진다. 글자(textContent)로 읽어 가는 쪽이 "194/194통과"로 붙여 읽지 않도록 글자 사이 공백을 지킨다.
  test('큰 숫자와 단위 사이에 공백이 있다', async ({ page }) => {
    await page.goto('/');
    for (const [i, h] of profile.highlights.entries()) {
      await expect(page.locator('#highlights .hl__figure').nth(i)).toHaveText(`${h.figure.value} ${h.figure.unit}`);
    }
  });
});

// 핵심 성과의 숫자는 매일 갱신되는 기여 데이터에서 계산한다. 머리글의 기준일이 정적인 날짜를 그대로 말하면 안 된다(P2-R3).
test('핵심 성과 머리글은 기여 데이터의 마지막 변경 날짜와 매일 자동 갱신을 밝힌다', async ({ page }) => {
  await page.goto('/');
  const note = page.locator('#highlights .section-header__note');
  await expect(note).toContainText(`${raw.asOf.slice(0, 10)} 기준 · 매일 자동 갱신`);
  await expect(note).not.toContainText('2026-09-30');
});

test.describe('핵심 성과(움직임 켬)', () => {
  test('화면에 들어오면 숫자가 세어 올라가 원래 값에서 멈춘다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#highlights').scrollIntoViewIfNeeded();
    for (const [i, h] of profile.highlights.entries()) {
      await expect(page.locator('#highlights [data-figure]').nth(i)).toHaveText(h.figure.value, { timeout: 5000 });
    }
  });

  // 위 시험은 시작 전에도 원래 글자가 그대로라서 세어 올라가지 않아도 통과한다.
  // 글자가 바뀔 때마다 기록해, 0에서 시작해 줄지 않고 올라가 원래 글자로 끝나는지와 튕긴 뒤 제자리에 서는지를 지킨다.
  test('숫자마다 0에서 시작해 세어 올라가고, 원래 글자로 끝나며 제자리에 선다', async ({ page }) => {
    type Seen = { __seen: string[][] };
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.evaluate(() => {
      const seen: string[][] = [];
      document.querySelectorAll('#highlights [data-figure]').forEach((el, i) => {
        seen[i] = [];
        // textContent를 쓸 때마다 새 글자 노드가 들어온다. 그 글자를 하나도 빼지 않고 적는다.
        new MutationObserver((records) => {
          for (const r of records) r.addedNodes.forEach((n) => seen[i].push(n.textContent ?? ''));
        }).observe(el, { childList: true });
      });
      (window as unknown as Seen).__seen = seen;
    });
    await page.locator('#highlights').scrollIntoViewIfNeeded();

    const finals = profile.highlights.map((h) => h.figure.value);
    await page.waitForFunction(
      (expected) => {
        const seen = (window as unknown as Seen).__seen;
        return expected.every((f, i) => seen[i]?.at(-1) === f);
      },
      finals,
      { timeout: 6000 },
    );
    const seen = await page.evaluate(() => (window as unknown as Seen).__seen);
    const lead = (text: string) => Number(text.match(/^\d[\d,]*/)?.[0].replaceAll(',', ''));
    for (const [i, final] of finals.entries()) {
      expect(seen[i][0], `${final}: 세기 시작하는 글자`).toBe(final.replace(/^\d[\d,]*/, '0'));
      expect(seen[i].at(-1), `${final}: 끝난 글자`).toBe(final);
      const leads = seen[i].map(lead);
      expect(leads, `${final}: 줄지 않고 올라간다`).toEqual([...leads].sort((a, b) => a - b));
    }

    // 튕기며 자리 잡은 뒤에는 항목과 숫자가 보이고 이동·회전이 남지 않는다.
    await expect
      .poll(() =>
        page.locator('#highlights .hl__item, #highlights [data-figure]').evaluateAll((els) =>
          els
            .filter((e) => Number(getComputedStyle(e).opacity) !== 1 || !new DOMMatrix(getComputedStyle(e).transform).isIdentity)
            .map((e) => e.className || e.tagName),
        ),
      )
      .toEqual([]);
  });

  // P1-R9: 등장 전 상태는 opacity만 쓴다. visibility로 숨기면 근거 링크에 키보드 초점이 닿지 못한다.
  test('등장하기 전에도 근거 링크에 초점이 닿고, 초점이 닿으면 항목이 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    const item = page.locator('#highlights .hl__item').first();
    const link = item.locator('a.evidence');
    const opacity = () => item.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await opacity()).toBe(0);
    await link.evaluate((a) => (a as HTMLElement).focus({ preventScroll: true }));
    expect(await link.evaluate((a) => document.activeElement === a)).toBe(true);
    await expect.poll(opacity).toBe(1);
  });

  // P1-R11: 세는 도중에 움직임 줄임을 켜면 되돌리기가 숫자를 원래 글자로 돌려 놓고, 세던 연출이 남아 다시 쓰지 않는다.
  // (P1-R10의 숨은 요소 검사는 투명도만 본다. 글자가 중간 값으로 남는 회귀는 여기서만 잡힌다.)
  test('세는 도중에 움직임 줄임을 켜면 숫자가 곧바로 원래 글자가 되고 그대로 남는다', async ({ page }) => {
    const finals = profile.highlights.map((h) => h.figure.value);
    const figures = () => page.locator('#highlights [data-figure]').evaluateAll((els) => els.map((e) => e.textContent));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#highlights').scrollIntoViewIfNeeded();
    // 마지막 숫자가 원래 글자에서 벗어나면 세기가 시작된 것이다.
    await page.waitForFunction(
      (last) => document.querySelector('#highlights .hl__item:last-child [data-figure]')?.textContent !== last,
      finals.at(-1),
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('motion'));
    expect(await figures()).toEqual(finals);
    await page.waitForTimeout(500); // 세던 연출이 남아 있다면 이 사이에 다시 쓴다
    expect(await figures()).toEqual(finals);
  });
});

// P1-R27: 항목이 여러 줄로 나뉘는 폭에서는 숫자마다 화면에 들어올 때 튕긴다. 한꺼번에 재생하면 접힌 선 아래의 숫자는 보이기 전에 끝난다.
test.describe('핵심 성과(모바일 폭: 숫자마다 보일 때 재생)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('화면 밖 숫자는 기다렸다가, 화면에 들어오면 튕기며 세어 올라간다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
    await page.locator('#highlights').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60));
    await page.waitForTimeout(1500);
    const last = page.locator('#highlights [data-figure]').last();
    expect(await last.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);
    await last.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect.poll(() => last.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 4000 }).toBe(1);
    // 건수는 매일 바뀌므로 데이터에서 계산한 profile의 값을 읽는다.
    await expect(last).toHaveText(profile.highlights[profile.highlights.length - 1].figure.value, { timeout: 4000 });
  });
});
