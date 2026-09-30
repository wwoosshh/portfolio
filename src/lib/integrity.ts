import type { Contribution, Profile, Project } from './schema';

export interface IntegrityInput {
  projects: { id: string; tier: Project['tier'] }[];
  contributions: Contribution[];
  skills: Profile['skills'];
}

export function checkIntegrity({ projects, contributions, skills }: IntegrityInput): string[] {
  const errors: string[] = [];
  const tierById = new Map(projects.map((p) => [p.id, p.tier]));
  const seen = new Set<string>();

  for (const c of contributions) {
    const key = `${c.repo}#${c.number}`;
    if (seen.has(key)) errors.push(`기여 ${key}: 중복 항목`);
    seen.add(key);
    const tier = tierById.get(c.project);
    if (tier === undefined) errors.push(`기여 ${key}: 존재하지 않는 프로젝트 "${c.project}"`);
    else if (tier !== 'featured') errors.push(`기여 ${key}: "${c.project}"는 대표작(featured)이 아님`);
  }

  for (const group of skills) {
    for (const skill of group.items) {
      for (const id of skill.projects) {
        if (!tierById.has(id)) errors.push(`기술 "${skill.name}": 존재하지 않는 프로젝트 "${id}"`);
      }
    }
  }
  return errors;
}
