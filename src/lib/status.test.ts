import { describe, expect, test } from 'vitest';
import { contributionStatus, deploymentStatus, engagementStatus, engagementTarget, relatedStatus, view } from './status';

type Input = Parameters<typeof contributionStatus>[0];
const status = (o: Partial<Input> & Pick<Input, 'kind' | 'state'>) =>
  contributionStatus({ stateReason: null, review: null, labels: [], ...o });

describe('기여 상태', () => {
  test('병합된 PR', () => {
    expect(status({ kind: 'pr', state: 'merged' })).toEqual(view('ok', '병합됨'));
  });
  test('병합된 PR은 리뷰 결정과 관계없이 병합됨', () => {
    expect(status({ kind: 'pr', state: 'merged', review: 'approved' })).toEqual(view('ok', '병합됨'));
  });
  test('승인된 열린 PR은 병합 대기', () => {
    expect(status({ kind: 'pr', state: 'open', review: 'approved' })).toEqual(view('ok', '승인 · 병합 대기'));
  });
  test('변경 요청을 받은 열린 PR', () => {
    expect(status({ kind: 'pr', state: 'open', review: 'changes_requested' })).toEqual(view('wait', '변경 요청'));
  });
  test('리뷰 결정이 아직 없는 열린 PR은 리뷰 중', () => {
    expect(status({ kind: 'pr', state: 'open' })).toEqual(view('wait', '리뷰 중'));
    expect(status({ kind: 'pr', state: 'open', review: 'review_required' })).toEqual(view('wait', '리뷰 중'));
  });
  test('닫힌 PR은 사유를 함께 보여 준다', () => {
    expect(status({ kind: 'pr', state: 'closed', note: '절차 안내' })).toEqual(view('off', '닫힘 · 절차 안내'));
  });
  test('사유 없이 닫힌 PR', () => {
    expect(status({ kind: 'pr', state: 'closed' })).toEqual(view('off', '닫힘'));
  });
  test('닫힌 PR은 리뷰 결정이 남아 있어도 닫힘', () => {
    expect(status({ kind: 'pr', state: 'closed', review: 'approved' })).toEqual(view('off', '닫힘'));
  });
  test('triaged 라벨이 붙은 열린 이슈는 분류됨', () => {
    expect(status({ kind: 'issue', state: 'open', labels: ['triaged'] })).toEqual(view('ok', '분류됨'));
  });
  test('라벨 없는 열린 이슈는 열림', () => {
    expect(status({ kind: 'issue', state: 'open' })).toEqual(view('wait', '열림'));
  });
  test('완료로 닫힌 이슈는 해결됨', () => {
    expect(status({ kind: 'issue', state: 'closed', stateReason: 'completed', labels: ['triaged'] })).toEqual(
      view('ok', '해결됨'),
    );
  });
  test('계획 없음·중복 등으로 닫힌 이슈는 닫힘', () => {
    expect(status({ kind: 'issue', state: 'closed', stateReason: 'not_planned' })).toEqual(view('off', '닫힘'));
    expect(status({ kind: 'issue', state: 'closed', stateReason: 'duplicate' })).toEqual(view('off', '닫힘'));
    expect(status({ kind: 'issue', state: 'closed' })).toEqual(view('off', '닫힘'));
  });
});

describe('다른 개발자의 수정 PR 상태', () => {
  test('병합된 PR', () => {
    expect(relatedStatus({ state: 'merged' })).toEqual(view('ok', '병합됨'));
  });
  test('닫힌 PR', () => {
    expect(relatedStatus({ state: 'closed' })).toEqual(view('off', '닫힘'));
  });
  test('열린 PR은 리뷰 대기', () => {
    expect(relatedStatus({ state: 'open' })).toEqual(view('wait', '리뷰 대기'));
  });
});

describe('다른 개발자의 작업에 남긴 참여', () => {
  test('승인한 리뷰', () => {
    expect(engagementStatus({ kind: 'pr', review: 'approved' })).toEqual(view('ok', '리뷰 · 승인'));
  });
  test('변경을 요청한 리뷰', () => {
    expect(engagementStatus({ kind: 'pr', review: 'changes_requested' })).toEqual(view('wait', '리뷰 · 변경 요청'));
  });
  test('의견만 남긴 리뷰', () => {
    expect(engagementStatus({ kind: 'pr', review: 'commented' })).toEqual(view('off', '리뷰 의견'));
  });
  test('리뷰 없이 남긴 댓글은 PR 댓글이나 이슈 댓글', () => {
    expect(engagementStatus({ kind: 'pr', review: null })).toEqual(view('off', 'PR 댓글'));
    expect(engagementStatus({ kind: 'issue', review: null })).toEqual(view('off', '이슈 댓글'));
  });
  test('대상은 연 사람, 종류, 지금 상태로 쓴다', () => {
    expect(engagementTarget({ author: 'tintin1942', kind: 'pr', state: 'open' })).toBe('tintin1942의 PR · 열림');
    expect(engagementTarget({ author: 'a', kind: 'pr', state: 'merged' })).toBe('a의 PR · 병합됨');
    expect(engagementTarget({ author: 'b', kind: 'issue', state: 'closed' })).toBe('b의 이슈 · 닫힘');
  });
});

describe('배포 상태', () => {
  test('live는 운영 중', () => {
    expect(deploymentStatus({ state: 'live', url: 'https://semicollon.com' })).toEqual(view('ok', '운영 중'));
  });
  test('down이고 영상이 있으면 시연 영상을 알린다', () => {
    expect(deploymentStatus({ state: 'down', video: 'https://youtu.be/x' })).toEqual(
      view('off', '서버 중지 · 시연 영상'),
    );
  });
  test('down이고 영상이 없으면 서버 중지', () => {
    expect(deploymentStatus({ state: 'down' })).toEqual(view('off', '서버 중지'));
  });
  test('none이면 표시하지 않는다', () => {
    expect(deploymentStatus({ state: 'none' })).toBeNull();
  });
  test('기호는 톤마다 하나로 고정된다', () => {
    expect([view('ok', '').symbol, view('wait', '').symbol, view('off', '').symbol]).toEqual(['✓', '●', '○']);
  });
});
