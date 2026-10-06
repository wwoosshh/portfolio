import { describe, expect, test } from 'vitest';
import { liveMetrics, metricsOf } from './live-metrics';
import { contributionsSchema, type Contributions } from './schema';

const FUZZER = 'torch-compile-fuzzer';
const MERGED = { state: 'merged', mergedAt: '2026-09-30T05:00:00Z' };

type Raw = Record<string, unknown>;
const item = (repo: string, kind: 'pr' | 'issue', number: number, o: Raw = {}): Raw => ({
  repo,
  kind,
  number,
  title: 'title',
  state: 'open',
  url: `https://github.com/${repo}/${kind === 'pr' ? 'pull' : 'issues'}/${number}`,
  project: null,
  createdAt: '2026-09-29T10:00:00Z',
  ...o,
});
const related = (repo: string, number: number, state: 'open' | 'merged' | 'closed'): Raw => ({
  repo,
  number,
  title: 'fix',
  state,
  url: `https://github.com/${repo}/pull/${number}`,
  author: 'someone',
});

const fixture = (items: Raw[], own: Partial<Contributions['own']> = {}): Contributions =>
  contributionsSchema.parse({
    asOf: '2026-10-06T00:00:00Z',
    author: 'wwoosshh',
    excludeOwners: ['wwoosshh', 'semicollon-club'],
    ignore: [],
    items,
    own: {
      asahi: { mergedPrs: 81, mineMergedPrs: 79, url: 'https://github.com/semicollon-club/asahi/pulls?q=merged' },
      entail: { pypiReleases: 19, pypiLatest: '2.4.0', url: 'https://pypi.org/project/entail-ai/' },
      ...own,
    },
  });

const PT = 'pytorch/pytorch';
// 퍼저 이슈 3건(분류 2, 해결 1)과 PR 4건(병합 1, 열림 2, 닫힘 1). 뒤의 세 항목은 세지 않는다.
const fuzzerItems: Raw[] = [
  item(PT, 'issue', 1, { project: FUZZER, labels: ['triaged'] }),
  item(PT, 'issue', 2, { project: FUZZER, labels: ['triaged'], state: 'closed', stateReason: 'completed' }),
  item(PT, 'issue', 3, { project: FUZZER }),
  item(PT, 'pr', 10, { project: FUZZER, ...MERGED }),
  item(PT, 'pr', 11, { project: FUZZER }),
  item(PT, 'pr', 12, { project: FUZZER, review: 'approved' }),
  item(PT, 'pr', 13, { project: FUZZER, state: 'closed' }),
  item(PT, 'issue', 20, { project: null }),
  item(PT, 'issue', 21, { project: 'entail' }),
  item('vllm-project/vllm', 'issue', 22, { project: FUZZER }),
];

describe('torch-compile-fuzzer', () => {
  test('프로젝트가 같고 PyTorch 저장소인 항목만 센다', () => {
    const [issues, prs] = liveMetrics(FUZZER, fixture(fuzzerItems));
    expect(issues).toEqual({
      label: 'PyTorch 이슈',
      value: '3건 · 분류 2 · 해결 1',
      evidence: 'https://github.com/pytorch/pytorch/issues?q=is%3Aissue+author%3Awwoosshh',
      status: 'ok',
    });
    expect(prs).toEqual({
      label: 'PyTorch 수정 PR',
      value: '병합 1 · 리뷰 중 2 · 닫힘 1',
      evidence: 'https://github.com/pytorch/pytorch/pulls?q=is%3Apr+author%3Awwoosshh',
      status: 'ok',
    });
    expect(liveMetrics(FUZZER, fixture(fuzzerItems))).toHaveLength(2);
  });
  test('병합된 PR이 없으면 수정 PR 수치는 진행 중', () => {
    const open = fuzzerItems.filter((i) => i.state !== 'merged');
    const prs = liveMetrics(FUZZER, fixture(open))[1];
    expect(prs).toMatchObject({ value: '병합 0 · 리뷰 중 2 · 닫힘 1', status: 'wait' });
  });
});

// 일부러 저장소 이름순이 아닌 순서로 둔다.
const entailItems: Raw[] = [
  item('sgl-project/sglang', 'issue', 41227, {
    project: 'entail',
    related: [related('sgl-project/sglang', 41239, 'closed'), related('sgl-project/sglang', 41327, 'closed')],
  }),
  item('vllm-project/vllm', 'issue', 58675, { project: 'entail', related: [related('vllm-project/vllm', 58679, 'open')] }),
  item('Comfy-Org/ComfyUI', 'issue', 16490, { project: 'entail' }),
  item(PT, 'issue', 1, { project: FUZZER }),
];

describe('entail', () => {
  test('외부 이슈, 다른 개발자의 수정 PR, PyPI 릴리스 순서로 만든다', () => {
    expect(liveMetrics('entail', fixture(entailItems))).toEqual([
      {
        label: '외부 이슈 (ComfyUI·SGLang·vLLM)',
        value: '3건 · 열림 3',
        evidence: 'https://github.com/search?q=author%3Awwoosshh+-user%3Awwoosshh+-org%3Asemicollon-club&type=issues',
        status: 'wait',
      },
      {
        label: '다른 개발자의 수정 PR',
        value: '열림 1 · 병합 0 · 닫힘 2',
        // 첫 관련 PR의 주소
        evidence: 'https://github.com/sgl-project/sglang/pull/41239',
        status: 'wait',
      },
      {
        label: 'PyPI 릴리스',
        value: '19개 (최신 2.4.0)',
        evidence: 'https://pypi.org/project/entail-ai/',
        status: 'ok',
      },
    ]);
  });
  test('관련 PR이 하나라도 병합됐으면 ok, 열린 것도 병합된 것도 없으면 off', () => {
    const withState = (state: 'open' | 'merged' | 'closed') =>
      liveMetrics('entail', fixture([item('vllm-project/vllm', 'issue', 1, { project: 'entail', related: [related('vllm-project/vllm', 2, state)] })]))[1];
    expect(withState('merged')).toMatchObject({ value: '열림 0 · 병합 1 · 닫힘 0', status: 'ok' });
    expect(withState('closed')).toMatchObject({ value: '열림 0 · 병합 0 · 닫힘 1', status: 'off' });
    expect(withState('open')).toMatchObject({ value: '열림 1 · 병합 0 · 닫힘 0', status: 'wait' });
  });
  test('관련 PR이 없으면 그 수치를 만들지 않는다', () => {
    const labels = liveMetrics('entail', fixture([item('vllm-project/vllm', 'issue', 1, { project: 'entail' })])).map((m) => m.label);
    expect(labels).toEqual(['외부 이슈 (vLLM)', 'PyPI 릴리스']);
  });
});

describe('asahi', () => {
  test('main에 병합된 PR 수와 내 계정·다른 계정의 몫', () => {
    expect(liveMetrics('asahi', fixture([]))).toEqual([
      {
        label: 'main에 병합된 PR (제 계정 79건 + 다른 계정 2건)',
        value: '81건',
        evidence: 'https://github.com/semicollon-club/asahi/pulls?q=merged',
        status: 'ok',
      },
    ]);
  });
});

describe('그 밖의 프로젝트', () => {
  test('만들 수치가 없다', () => {
    expect(liveMetrics('geul-lang', fixture(fuzzerItems))).toEqual([]);
  });
});

describe('metricsOf', () => {
  const staticMetric = { label: '설계 결정 기록 (ADR)', value: '12개', evidence: 'https://github.com/semicollon-club/asahi/tree/main/docs/decisions' };
  test('계산한 수치를 앞에 두고 프런트매터의 수치를 뒤에 붙인다', () => {
    const data = fixture([]);
    const out = metricsOf({ id: 'asahi', data: { metrics: [staticMetric] } }, data);
    expect(out).toEqual([...liveMetrics('asahi', data), staticMetric]);
    expect(out[0].label).toContain('main에 병합된 PR');
    expect(out.at(-1)).toBe(staticMetric);
  });
  test('계산할 수치가 없는 프로젝트는 프런트매터의 수치 그대로', () => {
    expect(metricsOf({ id: 'geul-lang', data: { metrics: [staticMetric] } }, fixture([]))).toEqual([staticMetric]);
  });
});
