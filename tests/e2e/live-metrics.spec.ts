import { expect, test } from '@playwright/test';
import { contributions } from '../../src/data/contributions';
import { liveMetrics } from '../../src/lib/live-metrics';

// 건수는 매일 바뀐다. 기대값은 기여 데이터에서 계산하고, 숫자를 적지 않는다.
// 각 프로젝트의 핵심 결과(프런트매터의 첫 수치)가 맨 앞이고, 계산한 수치는 그 바로 뒤에 온다(P2-R4).
const IDS = ['torch-compile-fuzzer', 'entail', 'asahi'];
const HEADLINE = 1;
const LIVE_NOTE = '기여·릴리스 수치는 매일 자동 갱신';
const DATE = String.raw`\d{4}-\d{2}-\d{2}`;

for (const id of IDS) {
  test(`${id}: 상세 페이지의 핵심 수치는 핵심 결과 다음에 기여 데이터에서 계산한 수치가 나온다`, async ({ page }) => {
    const live = liveMetrics(id, contributions);
    expect(live.length).toBeGreaterThan(0);
    await page.goto(`/projects/${id}/`);
    const rows = page.locator('.metrics .metric');
    for (const [i, m] of live.entries()) {
      await expect(rows.nth(HEADLINE + i).locator('.metric__label')).toHaveText(m.label);
      await expect(rows.nth(HEADLINE + i).locator('.metric__value')).toHaveText(m.value);
    }
    // 맨 앞은 계산한 수치가 아니다.
    await expect(rows.first().locator('.metric__label')).not.toHaveText(live[0].label);
  });
}

test('홈 1장: 직접 운영하는 오픈소스의 수치 패널은 핵심 결과 다음에 계산한 수치가 온다', async ({ page }) => {
  await page.goto('/');
  for (const id of IDS) {
    const rows = page.locator(`#oss [data-project="${id}"] .pscene__metric`);
    for (const [i, m] of liveMetrics(id, contributions).entries()) {
      await expect(rows.nth(HEADLINE + i).locator('.pscene__metric-label'), id).toHaveText(m.label);
      await expect(rows.nth(HEADLINE + i).locator('.pscene__metric-value'), id).toHaveText(m.value);
    }
    await expect(rows.first().locator('.pscene__metric-label'), id).not.toHaveText(liveMetrics(id, contributions)[0].label);
  }
});

test('인쇄: 대표작 요약은 핵심 결과 다음에 계산한 수치를 싣는다', async ({ page }) => {
  await page.goto('/print/');
  for (const id of IDS) {
    const [first] = liveMetrics(id, contributions);
    const rows = page.locator(`.brief[data-project="${id}"] .brief__metrics li`);
    await expect(rows.nth(HEADLINE).locator('span').first(), id).toHaveText(first.label);
    await expect(rows.nth(HEADLINE).locator('strong'), id).toHaveText(first.value);
    await expect(rows.first().locator('span').first(), id).not.toHaveText(first.label);
  }
});

// 계산한 수치가 들어 있는 패널·목록만 그 수치가 매일 바뀐다고 밝힌다. 들어 있지 않으면 기준일만 적는다(P2-R3).
test('상세 페이지: 계산한 수치가 있는 프로젝트의 핵심 수치 위에 매일 자동 갱신을 밝힌다', async ({ page }) => {
  for (const id of IDS) {
    await page.goto(`/projects/${id}/`);
    await expect(page.locator('.metrics__asof'), id).toHaveText(new RegExp(`^${DATE} 기준 · ${LIVE_NOTE}$`));
  }
  await page.goto('/projects/geul-lang/');
  await expect(page.locator('.metrics__asof')).toHaveText(new RegExp(`^${DATE} 기준$`));
});

test('홈 1장: 계산한 수치가 있는 프로젝트의 패널만 매일 자동 갱신을 밝힌다', async ({ page }) => {
  await page.goto('/');
  for (const id of IDS) {
    await expect(page.locator(`#oss [data-project="${id}"] .pscene__asof`), id).toHaveText(
      new RegExp(`^${DATE} 기준 · ${LIVE_NOTE}$`),
    );
  }
  for (const id of ['geul-lang', 'inversa-bench']) {
    await expect(page.locator(`#oss [data-project="${id}"] .pscene__asof`), id).toHaveText(new RegExp(`^${DATE} 기준$`));
  }
});
