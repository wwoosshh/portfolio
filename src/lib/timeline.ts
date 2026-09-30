import { formatPeriod } from './format';
import type { Profile } from './schema';

export interface TimelineItem {
  when: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  sortKey: string;
}

export function buildTimeline(
  profile: Pick<Profile, 'experience' | 'activities' | 'education' | 'military'>,
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...profile.experience.map((e) => ({
      when: formatPeriod(e.period),
      title: e.org,
      subtitle: `${e.product} · ${e.role} · ${e.employment}`,
      bullets: e.bullets,
      sortKey: e.period.start,
    })),
    ...profile.activities.map((a) => ({
      when: formatPeriod(a.period),
      title: `${a.name} · ${a.role}`,
      bullets: a.bullets,
      sortKey: a.period.start,
    })),
    ...(profile.military
      ? [
          {
            when: formatPeriod(profile.military.period),
            title: '병역',
            subtitle: profile.military.status,
            bullets: [],
            sortKey: profile.military.period.start,
          },
        ]
      : []),
    ...profile.education.map((ed) => ({
      when: formatPeriod(ed.period),
      title: `${ed.school} · ${ed.major}`,
      subtitle: ed.status,
      bullets: [],
      sortKey: ed.period.start,
    })),
  ];
  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}
