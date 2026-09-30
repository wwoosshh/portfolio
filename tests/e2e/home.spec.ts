import { expect, test } from '@playwright/test';

test('홈: 섹션이 정해진 순서로 있다', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section[id]').evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(['intro', 'highlights', 'ml', 'agent-product', 'experience', 'how-i-work', 'more', 'skills', 'contact']);
});

test('홈: 소개에 대표 분야와 연락 버튼이 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('정확성을 검증하는');
  await expect(page.locator('h1')).toContainText('AI/ML 시스템 엔지니어');
  await expect(page.locator('#intro a[href="https://github.com/wwoosshh"]')).toBeVisible();
  await expect(page.locator('#intro a[href="mailto:nunconnect1@gmail.com"]')).toBeVisible();
  await expect(page.locator('#intro a[href="/portfolio.pdf"]')).toHaveAttribute('download', '우성현_포트폴리오.pdf');
});

test('홈: 제목의 강조 문구와 나머지 문구 사이에 공백이 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('정확성을 검증하는 AI/ML 시스템 엔지니어');
});

test('홈: 핵심 성과는 3~4개이고 모두 근거 링크가 있다', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#highlights li');
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).locator('a.evidence')).toHaveCount(1);
  }
});

test('홈: 대표작 카드는 상세 페이지로 연결된다', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a[data-detail-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) expect(href).toMatch(/^\/projects\/[a-z0-9-]+\/$/);
});

test('홈: 콘솔 에러가 없다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  expect(errors).toEqual([]);
});

test('바닥글: 소스 링크 앞에 공백이 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-footer')).toContainText('만들었습니다 · 소스');
});

test('홈: 새 탭 링크는 rel과 ↗를 모두 가진다', async ({ page }) => {
  await page.goto('/');
  const bad = await page
    .locator('a[target="_blank"]')
    .evaluateAll((els) =>
      els
        .filter((a) => a.getAttribute('rel') !== 'noopener noreferrer' || !(a.textContent ?? '').includes('↗'))
        .map((a) => a.getAttribute('href')),
    );
  expect(bad).toEqual([]);
});
