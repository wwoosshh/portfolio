import { heroSchema } from '../lib/demo-schema';

// 히어로 오라클 장면의 실제 데이터. 값은 원본에서 그대로 옮겼다(설계 §7).
export const hero = heroSchema.parse({
  runs: { approx: 21000, minutes: 45 },
  sample: {
    issue: 198094,
    url: 'https://github.com/pytorch/pytorch/issues/198094',
    summary: 'scatter 결과를 입력 버퍼에 제자리 연산으로 바꿔 넣어, 뒤따르는 x.zero_()가 반환값까지 0으로 덮어씁니다.',
    code: [
      'def fn(x, src):',
      '    y = torch.slice_scatter(x, src[1:3], dim=0, start=1, end=3)',
      '    x.zero_()',
      '    return y',
    ].join('\n'),
    eager: '[0, 1, 2, 3, 4, 5, -6, -5]',
    compiled: '[0, 0, 0, 0, 0, 0, 0, 0]',
    compiledLabel: 'inductor',
    env: 'torch 2.14.0+cu130 · CUDA',
  },
  provenance: {
    sources: [
      { url: 'https://github.com/pytorch/pytorch/issues/198094', note: '재현 함수와 두 출력(본문 코드 블록)' },
      {
        url: 'https://github.com/wwoosshh/AI-accelerator-compiler/blob/afcfac2376eeaa03f822ea5ea0d09e897f092ef8/fuzz/README.md?plain=1#L4-L5',
        sha: 'afcfac2376eeaa03f822ea5ea0d09e897f092ef8',
        lines: 'L4-L5',
        note: '약 21,000개 프로그램(45분)',
      },
    ],
    extractedBy: 'gh issue view 198094 -R pytorch/pytorch --json body (코드 블록을 그대로 복사)',
    verifiedAt: '2026-09-30',
  },
});
