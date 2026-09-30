import type { Contribution, Project, StatusTone } from './schema';

export type Tone = StatusTone;

export interface StatusView {
  tone: Tone;
  symbol: '✓' | '●' | '○';
  text: string;
}

const SYMBOL: Record<Tone, StatusView['symbol']> = { ok: '✓', wait: '●', off: '○' };

export const TONE_TEXT: Record<Tone, string> = { ok: '확인됨', wait: '진행 중', off: '종료' };

export function view(tone: Tone, text: string): StatusView {
  return { tone, symbol: SYMBOL[tone], text };
}

export function contributionStatus(c: Pick<Contribution, 'kind' | 'state' | 'labels' | 'note'>): StatusView {
  if (c.kind === 'pr') {
    if (c.state === 'merged') return view('ok', '머지됨');
    if (c.state === 'open') return view('wait', '리뷰 중');
    return view('off', c.note ? `닫힘 · ${c.note}` : '닫힘');
  }
  if (c.state === 'closed') return view('off', '닫힘');
  return c.labels.includes('triaged') ? view('ok', '분류됨') : view('wait', '열림');
}

export function deploymentStatus(deployment: Project['deployment']): StatusView | null {
  if (deployment.state === 'live') return view('ok', '운영 중');
  if (deployment.state === 'down') return view('off', deployment.video ? '서버 중지 · 시연 영상' : '서버 중지');
  return null;
}
