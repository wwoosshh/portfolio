import { getCollection, type CollectionEntry } from 'astro:content';
import { contributions } from '../data/contributions';
import { profile } from '../data/profile';
import { checkIntegrity } from './integrity';
import type { Contribution, Contributions, Profile } from './schema';

export type ProjectEntry = CollectionEntry<'projects'>;

export interface Site {
  profile: Profile;
  contributions: Contributions;
  all: ProjectEntry[];
  featured: ProjectEntry[];
  /** 1장 오픈소스에 놓는 대표작(group: oss), order 순서. */
  oss: ProjectEntry[];
  /** 2장 개인 프로젝트에 놓는 대표작(group: personal), order 순서. */
  personal: ProjectEntry[];
  cards: ProjectEntry[];
  lines: ProjectEntry[];
  byId: Map<string, ProjectEntry>;
  contributionsFor: (projectId: string) => Contribution[];
}

export async function loadSite(): Promise<Site> {
  const all = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const errors = checkIntegrity({
    projects: all.map((p) => ({ id: p.id, tier: p.data.tier })),
    contributions: contributions.items,
    engagements: contributions.engagements,
    ignore: contributions.ignore,
    skills: profile.skills,
  });
  if (errors.length > 0) {
    throw new Error(`콘텐츠 무결성 오류:\n- ${errors.join('\n- ')}`);
  }
  const featured = all.filter((p) => p.data.tier === 'featured');
  return {
    profile,
    contributions,
    all,
    featured,
    oss: featured.filter((p) => p.data.group === 'oss'),
    personal: featured.filter((p) => p.data.group === 'personal'),
    cards: all.filter((p) => p.data.tier === 'card'),
    lines: all.filter((p) => p.data.tier === 'line'),
    byId: new Map(all.map((p) => [p.id, p])),
    contributionsFor: (projectId) => contributions.items.filter((c) => c.project === projectId),
  };
}
