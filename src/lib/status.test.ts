import { describe, expect, test } from 'vitest';
import { contributionStatus, deploymentStatus, view } from './status';

describe('기여 상태', () => {
  test('머지된 PR', () => {
    expect(contributionStatus({ kind: 'pr', state: 'merged', labels: [] })).toEqual(view('ok', '머지됨'));
  });
  test('열린 PR은 리뷰 중', () => {
    expect(contributionStatus({ kind: 'pr', state: 'open', labels: [] })).toEqual(view('wait', '리뷰 중'));
  });
  test('닫힌 PR은 사유를 함께 보여 준다', () => {
    expect(contributionStatus({ kind: 'pr', state: 'closed', labels: [], note: '절차 안내' })).toEqual(
      view('off', '닫힘 · 절차 안내'),
    );
  });
  test('사유 없이 닫힌 PR', () => {
    expect(contributionStatus({ kind: 'pr', state: 'closed', labels: [] })).toEqual(view('off', '닫힘'));
  });
  test('triaged 라벨이 붙은 열린 이슈는 분류됨', () => {
    expect(contributionStatus({ kind: 'issue', state: 'open', labels: ['triaged'] })).toEqual(view('ok', '분류됨'));
  });
  test('라벨 없는 열린 이슈는 열림', () => {
    expect(contributionStatus({ kind: 'issue', state: 'open', labels: [] })).toEqual(view('wait', '열림'));
  });
  test('닫힌 이슈', () => {
    expect(contributionStatus({ kind: 'issue', state: 'closed', labels: ['triaged'] })).toEqual(view('off', '닫힘'));
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
