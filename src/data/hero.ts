import { heroSchema } from '../lib/demo-schema';

// 히어로 오라클 장면의 실제 데이터(설계 §7). 원본에서 옮긴 방식은 provenance에 적었다:
// 재현 코드는 fn 함수만 발췌했고, 두 출력 값은 그대로 옮겼고, 환경과 원인 요약은 원본을 줄여 적었다.
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
      {
        url: 'https://github.com/pytorch/pytorch/issues/198094',
        note: '재현 함수 fn(본문 첫 코드 블록에서 발췌), 두 출력 값(둘째 코드 블록), 환경(Versions 절의 torch·CUDA를 줄여 적음), 원인 요약(Root cause 절을 한국어로 줄여 씀)',
      },
      {
        url: 'https://github.com/wwoosshh/AI-accelerator-compiler/blob/afcfac2376eeaa03f822ea5ea0d09e897f092ef8/fuzz/README.md?plain=1#L4-L5',
        sha: 'afcfac2376eeaa03f822ea5ea0d09e897f092ef8',
        lines: 'L4-L5',
        note: 'L4: 실행한 프로그램 수(약 21,000개)와 걸린 시간(45분), L5: 찾은 조용한 오답 계열 목록(H2 포함)',
      },
      {
        url: 'https://github.com/wwoosshh/AI-accelerator-compiler/blob/afcfac2376eeaa03f822ea5ea0d09e897f092ef8/fuzz/repro/ISSUE_DRAFT_H2_inductor_scatter_reinplace_input.md?plain=1#L11-L28',
        sha: 'afcfac2376eeaa03f822ea5ea0d09e897f092ef8',
        lines: 'L11-L28',
        note: 'H2 계열 이슈 초안: 같은 재현 함수 fn과 두 출력 값이 #198094 본문과 같다(퍼저가 찾은 계열이라는 표기의 근거)',
      },
    ],
    extractedBy:
      'gh issue view 198094 -R pytorch/pytorch --json body — 재현 코드에서 fn 함수만 발췌(줄 끝 주석 제외), 두 출력 줄은 값 그대로 복사(줄 끝의 # eager, # inductor는 라벨로 옮김). 퍼저 저장소 파일은 gh api로 같은 커밋(sha)의 내용을 읽어 확인',
    verifiedAt: '2026-09-30',
  },
});
