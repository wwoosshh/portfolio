import { describe, expect, test } from 'vitest';
import { checkIntegrity } from './integrity';
import { contributionSchema } from './schema';

const issue = (number: number, project: string) =>
  contributionSchema.parse({
    repo: 'pytorch/pytorch',
    kind: 'issue',
    number,
    title: 'bug',
    state: 'open',
    url: `https://github.com/pytorch/pytorch/issues/${number}`,
    project,
  });

const projects = [
  { id: 'entail', tier: 'featured' as const },
  { id: 'monney', tier: 'card' as const },
];
const skills = [{ group: 'AI/ML', items: [{ name: 'vLLM', projects: ['entail'] }] }];

describe('checkIntegrity', () => {
  test('모든 참조가 올바르면 오류가 없다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'entail')], skills })).toEqual([]);
  });

  test('없는 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'ghost')], skills })).toEqual([
      '기여 pytorch/pytorch#1: 존재하지 않는 프로젝트 "ghost"',
    ]);
  });

  test('대표작이 아닌 프로젝트를 가리키는 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'monney')], skills })).toEqual([
      '기여 pytorch/pytorch#1: "monney"는 대표작(featured)이 아님',
    ]);
  });

  test('중복된 기여를 잡는다', () => {
    expect(checkIntegrity({ projects, contributions: [issue(1, 'entail'), issue(1, 'entail')], skills })).toEqual([
      '기여 pytorch/pytorch#1: 중복 항목',
    ]);
  });

  test('없는 프로젝트를 가리키는 기술을 잡는다', () => {
    const badSkills = [{ group: 'AI/ML', items: [{ name: 'Rust', projects: ['ghost'] }] }];
    expect(checkIntegrity({ projects, contributions: [], skills: badSkills })).toEqual([
      '기술 "Rust": 존재하지 않는 프로젝트 "ghost"',
    ]);
  });
});
