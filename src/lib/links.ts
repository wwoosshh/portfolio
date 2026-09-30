import type { Project } from './schema';

export interface ProjectTarget {
  href: string;
  external: boolean;
}

export function projectHref(project: { id: string; data: Project }): ProjectTarget | null {
  const d = project.data;
  if (d.tier === 'featured') return { href: `/projects/${project.id}/`, external: false };
  if (d.deployment.state === 'live') return { href: d.deployment.url, external: true };
  if (d.repo?.visibility === 'public') return { href: d.repo.url, external: true };
  const first = d.links[0];
  return first ? { href: first.url, external: true } : null;
}
