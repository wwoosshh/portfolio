import type { Contribution, Profile, Project } from './schema';

export interface IntegrityInput {
  projects: { id: string; tier: Project['tier'] }[];
  contributions: Contribution[];
  /** 다른 개발자의 PR·이슈에 남긴 리뷰·댓글(engagements). 직접 연 항목과 겹칠 수 없다. */
  engagements?: { repo: string; number: number }[];
  /** 목록에서 뺄 항목의 `owner/repo#번호`. 데이터에 남아 있으면 오류다. */
  ignore: string[];
  skills: Profile['skills'];
}

export function checkIntegrity({ projects, contributions, engagements = [], ignore, skills }: IntegrityInput): string[] {
  const errors: string[] = [];
  const tierById = new Map(projects.map((p) => [p.id, p.tier]));
  const ignored = new Set(ignore);
  const seen = new Set<string>();

  for (const c of contributions) {
    const key = `${c.repo}#${c.number}`;
    if (seen.has(key)) errors.push(`기여 ${key}: 중복 항목`);
    seen.add(key);
    if (ignored.has(key)) errors.push(`기여 ${key}: ignore에 적힌 항목이 items에 남아 있음`);
    // 자동으로 새로 찾은 기여는 아직 찾은 도구(project)가 없다.
    if (c.project === null) continue;
    const tier = tierById.get(c.project);
    if (tier === undefined) errors.push(`기여 ${key}: 존재하지 않는 프로젝트 "${c.project}"`);
    else if (tier !== 'featured') errors.push(`기여 ${key}: "${c.project}"는 대표작(featured)이 아님`);
  }

  const engaged = new Set<string>();
  for (const e of engagements) {
    const key = `${e.repo}#${e.number}`;
    if (engaged.has(key)) errors.push(`참여 ${key}: 중복 항목`);
    engaged.add(key);
    if (ignored.has(key)) errors.push(`참여 ${key}: ignore에 적힌 항목이 engagements에 남아 있음`);
    if (seen.has(key)) errors.push(`참여 ${key}: 직접 연 항목(items)과 겹침`);
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
