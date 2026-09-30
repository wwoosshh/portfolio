import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { devices, expect, test, type Page } from '@playwright/test';

const DIST = path.resolve('dist');

// index.html의 모듈 스크립트에서 시작해 정적·동적 import를 모두 따라간다.
function homeScripts(): string[] {
  const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const queue = [...html.matchAll(/<script[^>]*\ssrc="(\/_astro\/[^"]+\.js)"/g)].map((m) => path.join(DIST, m[1]));
  const seen = new Set<string>();
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      queue.push(path.resolve(path.dirname(file), m[1]));
    }
  }
  return [...seen];
}

test('홈의 자바스크립트 합계는 gzip 기준 100KB 이하다', () => {
  const files = homeScripts();
  expect(files.length).toBeGreaterThan(0);
  const total = files.reduce((sum, f) => sum + gzipSync(readFileSync(f)).length, 0);
  console.log(`홈 JS: ${files.length}개, gzip ${(total / 1024).toFixed(1)}KB`);
  expect(total).toBeLessThanOrEqual(100 * 1024);
});

interface Shift {
  value: number;
  nodes: string[];
}

// 레이아웃 흔들림 측정을 시작한다. buffered라서 불러오는 동안 이미 일어난 흔들림도 센다.
// 흔들린 노드(sources)도 모아 두어, 예산을 넘으면 어디가 흔들렸는지 알 수 있다.
async function observeCls(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cls: number; __shifts: { value: number; nodes: string[] }[] };
    w.__cls = 0;
    w.__shifts = [];
    const describe = (node: Node | null) => {
      const el = node instanceof Element ? node : (node?.parentElement ?? null);
      if (!el) return '(없는 노드)';
      return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + [...el.classList].map((c) => `.${c}`).join('');
    };
    type Entry = { value: number; hadRecentInput: boolean; sources: { node: Node | null }[] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as Entry[]) {
        if (e.hadRecentInput) continue;
        w.__cls += e.value;
        w.__shifts.push({ value: e.value, nodes: e.sources.map((s) => describe(s.node)) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

async function scrollToEnd(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(800);
}

// 불러오기부터 끝까지 스크롤한 뒤까지의 CLS를 잰다.
async function measureCls(page: Page): Promise<{ cls: number; shifts: Shift[] }> {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'ready');
  await observeCls(page);
  await scrollToEnd(page);
  await page.evaluate(async () => {
    await document.fonts.ready; // 늦은 글꼴의 교체 흔들림까지 센다
  });
  return page.evaluate(() => {
    const w = window as unknown as { __cls: number; __shifts: Shift[] };
    return { cls: w.__cls, shifts: w.__shifts };
  });
}

// 실패했을 때 어느 노드가 흔들렸는지 메시지에 남긴다.
const clsMessage = ({ cls, shifts }: { cls: number; shifts: Shift[] }) =>
  `CLS ${cls.toFixed(4)} — ${shifts.map((s) => `${s.value.toFixed(4)} ${s.nodes.join(', ')}`).join(' | ')}`;

test('끝까지 스크롤하는 동안 레이아웃 흔들림(CLS)이 0.05 미만이다', async ({ page }) => {
  const result = await measureCls(page);
  console.log(`CLS(데스크톱): ${result.cls.toFixed(4)}`);
  expect(result.cls, clsMessage(result)).toBeLessThan(0.05);
});

// 모바일 폭에서는 글꼴이 바뀌며 제목이 3줄에서 2줄로 줄어 그 아래 틀이 44px 밀린다(0.032~0.051로 예산에 아슬아슬했다).
// 연출이 준비되기 전에는 히어로의 빈 틀을 숨겨(Hero.astro, hero.spec.ts가 지킨다) 밀림을 세지 않는다.
test.describe('모바일 폭(lite)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('끝까지 스크롤하는 동안 레이아웃 흔들림(CLS)이 0.05 미만이다', async ({ page }) => {
    const result = await measureCls(page);
    console.log(`CLS(390x844): ${result.cls.toFixed(4)}`);
    expect(result.cls, clsMessage(result)).toBeLessThan(0.05);
  });
});

// 보고 전용: 글꼴 교체가 히어로 글줄을 다시 감아 생기는 흔들림은 글꼴 불러오기 전략의 몫이라(계획 3의 Lighthouse 단계)
// 값을 검사하지 않는다. 세 경로의 CLS를 콘솔과 주석에 기록만 한다. 검사하는 것은 각 경로에서 연출이 준비됐다는 사실뿐이다.
test('[보고 전용] 움직임 줄임·글꼴 지연 경로의 CLS를 기록한다', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const desktop = devices['Desktop Chrome'];
  const scenarios = [
    { name: '데스크톱, 움직임 줄임', options: { ...desktop, reducedMotion: 'reduce' as const }, fontDelayMs: 0 },
    { name: '데스크톱, 글꼴 1.6초 지연', options: { ...desktop }, fontDelayMs: 1600 },
    { name: '390x844, 글꼴 1.6초 지연', options: { ...desktop, viewport: { width: 390, height: 844 } }, fontDelayMs: 1600 },
  ];
  for (const scenario of scenarios) {
    await test.step(scenario.name, async () => {
      const context = await browser.newContext({ ...scenario.options, baseURL });
      try {
        const page = await context.newPage();
        if (scenario.fontDelayMs > 0) {
          await page.route('**/*.woff2', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, scenario.fontDelayMs));
            await route.continue();
          });
        }
        const result = await measureCls(page);
        console.log(`CLS(보고 전용, ${scenario.name}): ${clsMessage(result)}`);
        test.info().annotations.push({ type: `CLS ${scenario.name}`, description: result.cls.toFixed(4) });
      } finally {
        await context.close();
      }
    });
  }
});
