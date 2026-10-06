import { expect, test, type Page } from '@playwright/test';
import raw from '../../src/data/contributions.json' with { type: 'json' };
import { kstDate } from './dates';

// 건수는 매일 바뀐다. 기대값은 기여 데이터(JSON)에서 이 파일이 직접 세고, 숫자를 적지 않는다.
type Item = (typeof raw.items)[number];
type Related = { url: string; state: string };
const items: Item[] = raw.items;
const relatedOf = (c: Item): Related[] => (c as { related?: Related[] }).related ?? [];

const STATUS_WORDS = ['병합됨', '승인 · 병합 대기', '리뷰 중', '변경 요청', '닫힘', '해결됨', '분류됨', '열림'];
const RELATED_WORDS = ['병합됨', '닫힘', '리뷰 대기'];
const anyOf = (words: string[]) => new RegExp(words.join('|'));

const prs = items.filter((c) => c.kind === 'pr');
const expectedSum = [
  prs.filter((c) => c.state === 'merged').length,
  prs.filter((c) => c.state === 'open').length,
  items.filter((c) => c.kind === 'issue').length,
  new Set(items.map((c) => c.repo)).size,
].map(String);
const repos = [...new Set(items.map((c) => c.repo))];
const mergedItems = items.filter((c) => c.kind === 'pr' && c.state === 'merged');

const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
const rowOf = (page: Page, c: Item) => page.locator('.cboard__item').filter({ has: page.locator(`a[href="${c.url}"]`) });

test.describe('외부 기여 보드(움직임 줄임: 최종 상태)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('저장소마다 묶음이 하나이고 PyTorch가 맨 앞이다', async ({ page }) => {
    await page.goto('/');
    const groups = page.locator('#oss .cboard .cboard__repo');
    await expect(groups).toHaveCount(repos.length);
    await expect(groups.first()).toHaveAttribute('data-repo', 'pytorch/pytorch');
    for (const repo of repos) {
      const link = page.locator(`#oss .cboard__repo[data-repo="${repo}"] h4 a`);
      await expect(link).toHaveAttribute('href', `https://github.com/${repo}`);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toContainText(` · ${repo}`);
      await expect(link).toContainText('↗');
    }
  });

  test('항목마다 종류·상태 글자·제목과 rel·↗를 가진 외부 링크가 있다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#oss .cboard__item')).toHaveCount(items.length);
    for (const c of items) {
      const row = rowOf(page, c);
      await expect(row, c.url).toHaveCount(1);
      await expect(row.locator('.cboard__kind'), c.url).toHaveText(c.kind === 'pr' ? 'PR' : '이슈');
      await expect(row.locator('.cboard__head .status'), c.url).toHaveText(anyOf(STATUS_WORDS));
      await expect(row, c.url).toContainText(c.title);
      const link = row.locator(`a[href="${c.url}"]`);
      await expect(link, c.url).toHaveAttribute('target', '_blank');
      await expect(link, c.url).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link, c.url).toContainText(`#${c.number}`);
      await expect(link, c.url).toContainText('↗');
    }
  });

  test('다른 개발자의 수정 PR은 링크와 상태 글자가 항목 아래에 있다', async ({ page }) => {
    await page.goto('/');
    const withRelated = items.filter((c) => relatedOf(c).length > 0);
    expect(withRelated.length).toBeGreaterThan(0);
    for (const c of withRelated) {
      const row = rowOf(page, c);
      await expect(row.locator('.cboard__related > li'), c.url).toHaveCount(relatedOf(c).length);
      for (const r of relatedOf(c)) {
        const li = row.locator('.cboard__related > li').filter({ has: page.locator(`a[href="${r.url}"]`) });
        await expect(li, r.url).toContainText('다른 개발자의 수정 PR');
        await expect(li.locator('a'), r.url).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(li.locator('a'), r.url).toContainText('↗');
        await expect(li.locator('.status'), r.url).toHaveText(anyOf(RELATED_WORDS));
      }
    }
  });

  test('찾은 도구는 대표작 상세 페이지로 이어진다', async ({ page }) => {
    await page.goto('/');
    const toolsOf = (repo: string) => [...new Set(items.filter((c) => c.repo === repo && c.project).map((c) => c.project as string))];
    for (const repo of repos) {
      const tools = page.locator(`#oss .cboard__repo[data-repo="${repo}"] .cboard__tools`);
      const expected = toolsOf(repo);
      if (expected.length === 0) {
        await expect(tools).toHaveCount(0);
        continue;
      }
      await expect(tools).toContainText('찾은 도구:');
      const hrefs = await tools.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toEqual(expected.map((id) => `/projects/${id}/`));
    }
  });

  test('요약 숫자는 데이터에서 센 값과 같다', async ({ page }) => {
    await page.goto('/');
    const sum = page.locator('#oss .cboard__sum');
    await expect(sum.locator('dt')).toHaveText(['병합', '리뷰 중', '이슈', '프로젝트']);
    await expect(sum.locator('dd')).toHaveText(expectedSum);
  });

  test('아래에 매일 자동 확인과 마지막 변경 날짜가 있다', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#oss .cboard__asof')).toContainText('매일 자동 확인');
    await expect(page.locator('#oss .cboard__asof')).toContainText(`마지막 변경 ${kstDate(raw.asOf)}`);
  });
});

test.describe('외부 기여 보드(움직임 켬)', () => {
  const board = (page: Page) => page.locator('#oss .cboard');
  const hiddenInBoard = (page: Page) =>
    board(page)
      .locator('[data-reveal]')
      .evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) < 1).map((e) => e.outerHTML.slice(0, 80)));
  const stamps = (page: Page) => page.locator('.cboard__item[data-state="merged"] > .cboard__head > .status');

  /** 보드의 위에서 아래까지 천천히 내려, 묶음마다 자기 시작점을 지나가게 한다. */
  async function scrollThroughBoard(page: Page) {
    const { top, height } = await board(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    });
    const view = page.viewportSize()?.height ?? 720;
    for (let y = top - view / 2; y <= top + height; y += 300) {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      await page.waitForTimeout(60);
    }
  }

  test('보드가 화면에 들어오면 요약 숫자가 세어 올라 같은 값에서 멈추고, 숨은 [data-reveal]이 남지 않는다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await board(page).scrollIntoViewIfNeeded();
    await expect(page.locator('#oss .cboard__sum dd')).toHaveText(expectedSum, { timeout: 5000 });
    await scrollThroughBoard(page);
    await expect.poll(() => hiddenInBoard(page), { timeout: 8000 }).toEqual([]);
    await expect(page.locator('#oss .cboard__sum dd')).toHaveText(expectedSum);
  });

  test('병합 칩은 등장 전에는 숨어 있다가 도장처럼 찍힌 뒤 제자리에 선다', async ({ page }) => {
    test.skip(mergedItems.length === 0, '병합된 PR이 하나도 없는 날에는 찍을 도장이 없다');
    await page.goto('/');
    await ready(page);
    const opacity = () => stamps(page).evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)));
    expect(await opacity()).toEqual(mergedItems.map(() => 0));
    await scrollThroughBoard(page);
    await expect.poll(opacity, { timeout: 8000 }).toEqual(mergedItems.map(() => 1));
    await expect
      .poll(() => stamps(page).evaluateAll((els) => els.filter((e) => !new DOMMatrix(getComputedStyle(e).transform).isIdentity).length))
      .toBe(0);
  });

  // 숫자가 0에서 시작해 줄지 않고 올라가 원래 값으로 끝나는지: 글자가 바뀔 때마다 기록한다.
  test('요약 숫자는 0에서 시작해 줄지 않고 올라가 원래 값으로 끝난다', async ({ page }) => {
    type Seen = { __seen: string[][] };
    await page.goto('/');
    await ready(page);
    await page.evaluate(() => {
      const seen: string[][] = [];
      document.querySelectorAll('.cboard__sum dd').forEach((el, i) => {
        seen[i] = [];
        new MutationObserver((records) => {
          for (const r of records) r.addedNodes.forEach((n) => seen[i].push(n.textContent ?? ''));
        }).observe(el, { childList: true });
      });
      (window as unknown as Seen).__seen = seen;
    });
    await board(page).scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (expected) => {
        const seen = (window as unknown as Seen).__seen;
        return expected.every((f, i) => seen[i]?.at(-1) === f);
      },
      expectedSum,
      { timeout: 6000 },
    );
    const seen = await page.evaluate(() => (window as unknown as Seen).__seen);
    for (const [i, final] of expectedSum.entries()) {
      const numbers = seen[i].map(Number);
      expect(numbers[0], `${final}: 세기 시작하는 글자`).toBe(0);
      expect(seen[i].at(-1), `${final}: 끝난 글자`).toBe(final);
      expect(numbers, `${final}: 줄지 않고 올라간다`).toEqual([...numbers].sort((a, b) => a - b));
    }
  });

  test('세는 도중에 움직임 줄임을 켜면 요약 숫자가 곧바로 원래 글자가 된다', async ({ page }) => {
    await page.goto('/');
    await ready(page);
    await board(page).scrollIntoViewIfNeeded();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('motion'));
    await expect(page.locator('#oss .cboard__sum dd')).toHaveText(expectedSum);
    await page.waitForTimeout(500); // 세던 연출이 남아 있다면 이 사이에 다시 쓴다
    await expect(page.locator('#oss .cboard__sum dd')).toHaveText(expectedSum);
    expect(await hiddenInBoard(page)).toEqual([]);
    expect(await stamps(page).evaluateAll((els) => els.map((e) => Number(getComputedStyle(e).opacity)))).toEqual(
      mergedItems.map(() => 1),
    );
  });
});

// 도장 칩이 숨은 채 남지 않게 하는 마지막 안전망(.motion-failed). 되돌리기가 막혀 인라인 상태가 남은 경우를 직접 만들어 본다.
test('연출이 실패한 방문에서는 남은 인라인 상태가 있어도 병합 칩이 최종 모습이다', async ({ page }) => {
  test.skip(mergedItems.length === 0, '병합된 PR이 하나도 없는 날에는 찍을 도장이 없다');
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      get: () => ({ ready: Promise.reject(new Error('테스트: 연출 시작 실패')) }),
    });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'failed');
  const result = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll<HTMLElement>('.cboard__item[data-state="merged"] > .cboard__head > .status'));
    for (const el of chips) {
      el.style.opacity = '0';
      el.style.transform = 'scale(1.6)';
    }
    const left = chips.filter((e) => Number(getComputedStyle(e).opacity) < 1 || getComputedStyle(e).transform !== 'none').length;
    return { total: chips.length, left };
  });
  // 칩을 하나도 못 찾아 아무것도 검사하지 못한 채 통과하는 일을 막는다.
  expect(result).toEqual({ total: mergedItems.length, left: 0 });
});

test('장 순서: intro, highlights, oss, personal로 시작하고 목차가 새 장을 가리킨다', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section[id]').evaluateAll((els) => els.map((e) => e.id));
  expect(ids.slice(0, 4)).toEqual(['intro', 'highlights', 'oss', 'personal']);
  const hrefs = await page.locator('[data-chapter-link]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs).toEqual(['/#oss', '/#personal', '/#experience', '/#contact']);
});
