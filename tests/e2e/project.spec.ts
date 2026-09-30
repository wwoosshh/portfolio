import { expect, test } from '@playwright/test';

const ORDER = ['핵심 수치', '문제', '접근', '결과', '주요 결정', '한계와 다음 단계', 'AI 협업 방식', '링크'];

test('대표작 상세 페이지는 정해진 구성과 근거를 갖춘다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  const hrefs = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator('h1'), href).toHaveCount(1);
    const headings = (await page.locator('main h2').allInnerTexts()).map((t) => t.trim());
    expect(headings.filter((t) => ORDER.includes(t)), href).toEqual(ORDER);
    // 링크 섹션이 빈 목록으로 남지 않는다: 링크가 하나 이상 있거나 안내 문구가 있다.
    const linksSection = page.locator('section[aria-labelledby="links-title"]');
    const linkCount = await linksSection.locator('a').count();
    const linksText = await linksSection.innerText();
    expect(linkCount > 0 || linksText.includes('공개 링크가 없습니다.'), `${href}: 링크 섹션이 비어 있다`).toBe(true);
    expect(await page.locator('.metric .evidence').count(), href).toBeGreaterThan(0);
    expect(await page.locator('main').innerText(), href).toContain('AI 코딩 에이전트');
  }
  expect(errors).toEqual([]);
});

test('상세 페이지: 새 탭 링크는 rel과 ↗를 모두 가진다', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page
    .locator('a[data-detail-link]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href') as string))]);
  for (const href of hrefs) {
    await page.goto(href);
    const bad = await page
      .locator('a[target="_blank"]')
      .evaluateAll((els) =>
        els
          .filter((a) => a.getAttribute('rel') !== 'noopener noreferrer' || !(a.textContent ?? '').includes('↗'))
          .map((a) => a.getAttribute('href')),
      );
    expect(bad, href).toEqual([]);
  }
});
