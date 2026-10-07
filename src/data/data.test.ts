import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { engagementTally, tally } from '../lib/contribution-stats';
import { contributions } from './contributions';
import { profile } from './profile';

const PHONE = /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/;

test('공개 데이터에 전화번호 형식 문자열이 없다', () => {
  expect(JSON.stringify(profile)).not.toMatch(PHONE);
  expect(JSON.stringify(contributions)).not.toMatch(PHONE);
});

test('공개 연락처는 업무용 이메일과 GitHub뿐이다', () => {
  expect(profile.contact.email).toBe('nunconnect1@gmail.com');
  expect(profile.contact.github).toBe('https://github.com/wwoosshh');
});

test('핵심 성과는 3~4개이고 모두 https 근거가 있다', () => {
  expect(profile.highlights.length).toBeGreaterThanOrEqual(3);
  expect(profile.highlights.length).toBeLessThanOrEqual(4);
  for (const h of profile.highlights) expect(h.evidence.startsWith('https://')).toBe(true);
});

test('실무 경력은 글로만 공개한다', () => {
  for (const e of profile.experience) expect(e.disclosure).toBe('text-only');
});

// 건수는 매일 바뀐다. 기대값을 적지 않고 기여 데이터에서 다시 계산해 문구와 맞춘다.
test('소개와 핵심 성과의 기여 수치는 기여 데이터에서 계산한 값이다', () => {
  const pt = tally(contributions.items.filter((c) => c.repo === 'pytorch/pytorch'));
  const all = tally(contributions.items);
  const { asahi } = contributions.own;
  expect(profile.intro[0]).toContain(`수정 ${pt.merged}건이 병합되었습니다`);

  const [torch, oss, , agent] = profile.highlights;
  expect(torch.label).toBe(`PyTorch 기여자 · 병합 ${pt.merged}건`);
  expect(torch.detail).toContain(`이슈 ${pt.issues}건`);
  expect(torch.detail).toContain(`수정 PR ${pt.prs}건`);
  expect(torch.detail).toContain(`병합 ${pt.merged}건, 열린 PR ${pt.openPrs}건`);
  expect(torch.figure).toEqual({ value: String(pt.merged), unit: '건 병합' });
  expect(oss.label).toBe(`오픈소스 ${all.repos}곳에 기여`);
  expect(oss.detail).toContain(`이슈 ${all.issues}건, PR ${all.prs}건`);
  expect(oss.figure).toEqual({ value: String(all.repos), unit: '개 프로젝트' });
  // 다른 개발자의 PR을 리뷰한 수도 같은 데이터(engagements)에서 계산한다. 리뷰가 없으면 문장을 쓰지 않는다.
  const { reviews } = engagementTally(contributions.engagements);
  if (reviews > 0) expect(oss.detail).toContain(`다른 개발자의 PR ${reviews}건을 리뷰했습니다`);
  else expect(oss.detail).not.toContain('리뷰했습니다');
  expect(agent.detail).toContain(`병합된 PR ${asahi.mergedPrs}건`);
  expect(agent.figure).toEqual({ value: String(asahi.mergedPrs), unit: '건 병합' });
  expect(agent.evidence).toBe(asahi.url);
});

// 상태가 바뀌는 값(병합·리뷰·닫힘, 병합 PR 수, 릴리스 수)은 글에 적지 않고 데이터에서 계산한다.
test('대표작 글에는 상태가 바뀌는 문구가 남아 있지 않다', () => {
  const STALE = /리뷰 중|리뷰 대기|닫힘|닫혔|작성 시점|머지된 PR|병합된 PR\D{0,3}\d|16개|2\.1\.4|triaged/;
  for (const id of ['torch-compile-fuzzer', 'entail', 'asahi']) {
    const text = readFileSync(new URL(`../content/projects/${id}.mdx`, import.meta.url), 'utf8');
    expect(text.match(STALE)?.[0], `${id}.mdx`).toBeUndefined();
  }
});

// 인쇄본(PDF)은 정적이다. PDF에 실리는 brief가 "자동으로 갱신됩니다"라고만 쓰면 PDF가 스스로 갱신되는 것처럼 읽힌다.
// 자동 갱신을 말하는 문장은 갱신하는 곳(포트폴리오 사이트)을 밝힌다.
test('인쇄에 실리는 brief의 자동 갱신 문장은 포트폴리오 사이트가 갱신한다고 밝힌다', () => {
  for (const id of ['torch-compile-fuzzer', 'entail', 'asahi']) {
    const text = readFileSync(new URL(`../content/projects/${id}.mdx`, import.meta.url), 'utf8');
    const brief = text.match(/^brief:\n((?: {2}.*\n)+)/m)?.[1] ?? '';
    expect(brief, `${id}.mdx의 brief`).not.toBe('');
    expect(brief, `${id}.mdx`).not.toMatch(/자동으로 갱신됩니다/);
    for (const sentence of brief.match(/[^.]*자동으로 갱신[^.]*\./g) ?? []) {
      expect(sentence, `${id}.mdx`).toContain('포트폴리오 사이트');
    }
  }
});
