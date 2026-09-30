import { expect, test } from '@playwright/test';

test('바탕색과 글꼴이 토큰대로 적용된다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(251, 251, 248)');
  const loaded = await page.evaluate(() => {
    const families: string[] = [];
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') families.push(f.family.replace(/["']/g, ''));
    });
    return families;
  });
  expect(loaded).toContain('Pretendard Variable');
  expect(loaded).toContain('JetBrains Mono');
});

test('어떤 요소도 그림자가 없다', async ({ page }) => {
  await page.goto('/');
  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.boxShadow !== 'none' || s.textShadow !== 'none';
      })
      .map((el) => el.tagName),
  );
  expect(offenders).toEqual([]);
});

test('한글이 들어간 고정폭 글자도 웹폰트로 그려진다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  const { root } = await client.send('DOM.getDocument');
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.site-header__home' });
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.filter((f) => !f.isCustomFont).map((f) => f.familyName)).toEqual([]);
});
