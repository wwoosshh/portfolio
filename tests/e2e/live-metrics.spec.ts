import { expect, test } from '@playwright/test';
import { contributions } from '../../src/data/contributions';
import { liveMetrics } from '../../src/lib/live-metrics';

// 건수는 매일 바뀐다. 기대값은 기여 데이터에서 계산하고, 숫자를 적지 않는다.
const IDS = ['torch-compile-fuzzer', 'entail', 'asahi'];

for (const id of IDS) {
  test(`${id}: 상세 페이지의 핵심 수치 맨 앞에 기여 데이터에서 계산한 수치가 나온다`, async ({ page }) => {
    const live = liveMetrics(id, contributions);
    expect(live.length).toBeGreaterThan(0);
    await page.goto(`/projects/${id}/`);
    const rows = page.locator('.metrics .metric');
    for (const [i, m] of live.entries()) {
      await expect(rows.nth(i).locator('.metric__label')).toHaveText(m.label);
      await expect(rows.nth(i).locator('.metric__value')).toHaveText(m.value);
    }
  });
}

test('홈 1장: 수치 패널의 앞쪽은 계산한 수치다', async ({ page }) => {
  await page.goto('/');
  for (const id of ['entail', 'torch-compile-fuzzer']) {
    const rows = page.locator(`#ml [data-project="${id}"] .pscene__metric`);
    for (const [i, m] of liveMetrics(id, contributions).entries()) {
      await expect(rows.nth(i).locator('.pscene__metric-label'), id).toHaveText(m.label);
      await expect(rows.nth(i).locator('.pscene__metric-value'), id).toHaveText(m.value);
    }
  }
});

test('홈 2장: asahi 슬라이드의 첫 수치는 계산한 수치다', async ({ page }) => {
  await page.goto('/');
  const [first] = liveMetrics('asahi', contributions);
  const row = page.locator('#agent-product .deck__slide[data-project="asahi"] .deck__metric').first();
  await expect(row.locator('.deck__metric-label')).toHaveText(first.label);
  await expect(row.locator('strong')).toHaveText(first.value);
});

test('인쇄: 대표작 요약의 첫 수치는 계산한 수치다', async ({ page }) => {
  await page.goto('/print/');
  for (const id of IDS) {
    const [first] = liveMetrics(id, contributions);
    const row = page.locator(`.brief[data-project="${id}"] .brief__metrics li`).first();
    await expect(row.locator('span').first(), id).toHaveText(first.label);
    await expect(row.locator('strong'), id).toHaveText(first.value);
  }
});
