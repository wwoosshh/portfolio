import { describe, expect, test } from 'vitest';
import { checkIntegrity } from './integrity';
import { contributionSchema } from './schema';

const issue = (number: number, project: string | null) =>
  contributionSchema.parse({
    repo: 'pytorch/pytorch',
    kind: 'issue',
    number,
    title: 'bug',
    state: 'open',
    url: `https://github.com/pytorch/pytorch/issues/${number}`,
    project,
    createdAt: '2026-09-29T10:00:00Z',
  });

const projects = [
  { id: 'entail', tier: 'featured' as const },
  { id: 'monney', tier: 'card' as const },
];
const skills = [{ group: 'AI/ML', items: [{ name: 'vLLM', projects: ['entail'] }] }];
const ignore: string[] = [];

describe('checkIntegrity', () => {
  test('모든 참조가 올바르면 오류가 없다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'entail')], ignore, skills })).toEqual([]);
  });

  test('없는 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'ghost')], ignore, skills })).toEqual([
      '기여 pytorch/pytorch#1: 존재하지 않는 프로젝트 "ghost"',
    ]);
  });

  test('대표작이 아닌 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'monney')], ignore, skills })).toEqual([
      '기여 pytorch/pytorch#1: "monney"는 대표작(featured)이 아님',
    ]);
  });

  test('찾은 도구가 아직 없는(null) 기여는 대표작 검사를 건너뛴다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, null)], ignore, skills })).toEqual([]);
  });

  test('중복된 기여를 잡는다', () => {
    expect(
      checkIntegrity({ projects, contributions: [issue(1, 'entail'), issue(1, 'entail')], ignore, skills }),
    ).toEqual(['기여 pytorch/pytorch#1: 중복 항목']);
  });

  test('ignore에 적힌 항목이 items에 남아 있으면 잡는다', () => {
    expect(
      checkIntegrity({
        projects,
        contributions: [issue(1, 'entail'), issue(2, null)],
        ignore: ['pytorch/pytorch#2'],
        skills,
      }),
    ).toEqual(['기여 pytorch/pytorch#2: ignore에 적힌 항목이 items에 남아 있음']);
  });

  test('ignore에 적힌 항목이 items에 없으면 오류가 아니다', () => {
    expect(
      checkIntegrity({ projects, contributions: [issue(1, 'entail')], ignore: ['pytorch/pytorch#2'], skills }),
    ).toEqual([]);
  });

  test('없는 프로젝트를 가리키는 기술을 잡는다', () => {
    const badSkills = [{ group: 'AI/ML', items: [{ name: 'Rust', projects: ['ghost'] }] }];
    expect(checkIntegrity({ projects, contributions: [], ignore, skills: badSkills })).toEqual([
      '기술 "Rust": 존재하지 않는 프로젝트 "ghost"',
    ]);
  });
});
