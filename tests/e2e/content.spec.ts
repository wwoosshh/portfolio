import { expect, test } from '@playwright/test';

const ids = (page: import('@playwright/test').Page, selector: string) =>
  page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('data-project')));

test('콘텐츠 완성도: 섹션별 프로젝트가 정해진 순서로 모두 있다', async ({ page }) => {
  await page.goto('/');
  expect(await ids(page, '#ml [data-project]')).toEqual(['entail', 'torch-compile-fuzzer', 'geul-lang', 'inversa-bench']);
  expect(await ids(page, '#agent-product [data-project]')).toEqual(['asahi', 'barun-order', 'mzcube', 'nogada-rpg']);
  expect(await ids(page, '#more [data-project]')).toEqual([
    'geulos',
    'connect',
    'monney',
    'semicollon-homepage',
    'gitspace',
    'novel-worker',
    'battle-arena',
  ]);
});

test('콘텐츠 완성도: 기술 스택의 모든 항목이 프로젝트로 연결된다', async ({ page }) => {
  await page.goto('/');
  const skills = page.locator('#skills .skill');
  const count = await skills.count();
  expect(count).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < count; i++) {
    expect(await skills.nth(i).locator('.skill__projects a').count()).toBeGreaterThan(0);
  }
});

test('콘텐츠 완성도: 서버가 꺼진 서비스는 운영 중으로 표시되지 않는다', async ({ page }) => {
  await page.goto('/');
  for (const id of ['barun-order', 'mzcube']) {
    const card = page.locator(`[data-project="${id}"]`);
    await expect(card).toContainText('서버 중지');
    await expect(card).not.toContainText('운영 중');
  }
});

// R35: 한 줄 항목에는 다른 표기가 없으므로 역할 표기가 AI 협업 여부를 밝히는 유일한 자리다.
test('콘텐츠 완성도: 웹의 한 줄 프로젝트마다 역할 표기가 보인다', async ({ page }) => {
  await page.goto('/');
  const roles = await page.locator('#more .line .line__role').allInnerTexts();
  expect(roles).toHaveLength(4);
  expect(roles.filter((r) => r.trim().length === 0)).toEqual([]);
});

test('콘텐츠 완성도: 인쇄본의 그 밖의 프로젝트 행마다 역할 표기가 있다', async ({ page }) => {
  await page.goto('/print/');
  const roles = await page.locator('.print .lines > li .role').allInnerTexts();
  expect(roles).toHaveLength(7);
  expect(roles.filter((r) => r.trim().length === 0)).toEqual([]);
});

// 사이트에서 링크하지 않는 저장소
test('콘텐츠 완성도: 공개 페이지 어디에도 링크하지 않는 저장소가 없다', async ({ page, request }) => {
  const unlinked = ['foodiemap', 'backend'].join('-');
  await page.goto('/');
  const details = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  for (const path of ['/', '/print/', ...details]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain(unlinked);
  }
});
