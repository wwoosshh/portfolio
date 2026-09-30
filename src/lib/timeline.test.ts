import { expect, test } from 'vitest';
import { buildTimeline } from './timeline';

test('경력·활동·병역·학력을 최신순으로 합친다', () => {
  const items = buildTimeline({
    experience: [
      {
        org: '이루리랩스',
        product: '패스드림 AI',
        period: { start: '2026-06' },
        role: '개발',
        employment: '근로',
        bullets: ['한 일'],
        disclosure: 'text-only',
      },
    ],
    activities: [{ name: '세미콜론', role: '창립 회장', period: { start: '2026-05' }, bullets: [], links: [] }],
    education: [{ school: '청운대학교', major: '컴퓨터공학과', period: { start: '2022-03' }, status: '재학' }],
    military: { period: { start: '2023-09', end: '2025-03' }, status: '현역 복무 완료' },
  });
  expect(items.map((i) => i.title)).toEqual(['이루리랩스', '세미콜론 · 창립 회장', '병역', '청운대학교 · 컴퓨터공학과']);
  expect(items[0]).toMatchObject({ when: '2026.06 – 현재', subtitle: '패스드림 AI · 개발 · 근로', bullets: ['한 일'] });
  expect(items[2]).toMatchObject({ when: '2023.09 – 2025.03', subtitle: '현역 복무 완료' });
});
