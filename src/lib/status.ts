import type { Contribution, Engagement, Project, StatusTone } from './schema';

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

export function contributionStatus(
  c: Pick<Contribution, 'kind' | 'state' | 'stateReason' | 'review' | 'labels' | 'note'>,
): StatusView {
  if (c.kind === 'pr') {
    if (c.state === 'merged') return view('ok', '병합됨');
    if (c.state === 'closed') return view('off', c.note ? `닫힘 · ${c.note}` : '닫힘');
    if (c.review === 'approved') return view('ok', '승인 · 병합 대기');
    if (c.review === 'changes_requested') return view('wait', '변경 요청');
    return view('wait', '리뷰 중');
  }
  if (c.state === 'closed') return c.stateReason === 'completed' ? view('ok', '해결됨') : view('off', '닫힘');
  return c.labels.includes('triaged') ? view('ok', '분류됨') : view('wait', '열림');
}

/** 다른 개발자가 올린 관련 수정 PR의 상태. */
export function relatedStatus(r: { state: 'open' | 'merged' | 'closed' }): StatusView {
  if (r.state === 'merged') return view('ok', '병합됨');
  if (r.state === 'closed') return view('off', '닫힘');
  return view('wait', '리뷰 대기');
}

/** 다른 개발자의 PR·이슈에 내가 남긴 것. 승인만 확인됨(✓)이고, 의견과 댓글은 결정이 아니라 회색으로 둔다. */
export function engagementStatus(e: Pick<Engagement, 'kind' | 'review'>): StatusView {
  if (e.review === 'approved') return view('ok', '리뷰 · 승인');
  if (e.review === 'changes_requested') return view('wait', '리뷰 · 변경 요청');
  if (e.review === 'commented') return view('off', '리뷰 의견');
  return view('off', e.kind === 'pr' ? 'PR 댓글' : '이슈 댓글');
}

const STATE_TEXT: Record<Engagement['state'], string> = { open: '열림', merged: '병합됨', closed: '닫힘' };

/** 참여한 PR·이슈를 누가 열었고 지금 어떤 상태인지. */
export function engagementTarget(e: Pick<Engagement, 'author' | 'kind' | 'state'>): string {
  return `${e.author}의 ${e.kind === 'pr' ? 'PR' : '이슈'} · ${STATE_TEXT[e.state]}`;
}

export function deploymentStatus(deployment: Project['deployment']): StatusView | null {
  if (deployment.state === 'live') return view('ok', '운영 중');
  if (deployment.state === 'down') return view('off', deployment.video ? '서버 중지 · 시연 영상' : '서버 중지');
  return null;
}
