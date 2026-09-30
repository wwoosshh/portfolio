import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM 형식이어야 합니다');
const httpUrl = z.url({ protocol: /^https?$/ });

export const periodSchema = z
  .strictObject({ start: yearMonth, end: yearMonth.optional() })
  .refine((p) => !p.end || p.end >= p.start, {
    message: '종료 월이 시작 월보다 앞설 수 없습니다',
    path: ['end'],
  });

export const statusToneSchema = z.enum(['ok', 'wait', 'off']);

export const evidenceSchema = z.union([
  httpUrl,
  z.strictObject({ private: z.literal(true), note: z.string().min(1) }),
]);

export const metricSchema = z.strictObject({
  label: z.string().min(1),
  value: z.string().min(1),
  evidence: evidenceSchema,
  status: statusToneSchema.optional(),
});

export const linkSchema = z.strictObject({
  label: z.string().min(1),
  url: httpUrl,
  kind: z.enum(['repo', 'pr', 'issue', 'package', 'site', 'video', 'doc', 'ci']),
});

const repoSchema = z.discriminatedUnion('visibility', [
  z.strictObject({ visibility: z.literal('public'), url: httpUrl }),
  z.strictObject({ visibility: z.literal('private') }),
]);

const deploymentSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('live'), url: httpUrl }),
  z.strictObject({
    state: z.literal('down'),
    url: httpUrl.optional(),
    video: httpUrl.optional(),
    screenshot: z.string().optional(),
  }),
  z.strictObject({ state: z.literal('none') }),
]);

const briefSchema = z.strictObject({
  problem: z.string().min(1),
  approach: z.string().min(1),
  result: z.string().min(1),
});

export const projectSchema = z
  .strictObject({
    title: z.string().min(1),
    tagline: z.string().min(1),
    tier: z.enum(['featured', 'card', 'line']),
    track: z.enum(['ml', 'agent', 'product', 'other']),
    order: z.number().int(),
    period: periodSchema,
    role: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    repo: repoSchema.optional(),
    deployment: deploymentSchema,
    asOf: z.coerce.date(),
    brief: briefSchema.optional(),
    metrics: z.array(metricSchema).default([]),
    links: z.array(linkSchema).default([]),
    aiCollab: z.string().min(1),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.tier === 'featured') {
      if (p.track === 'other') {
        ctx.addIssue({ code: 'custom', path: ['track'], message: '대표작은 track이 ml, agent, product 중 하나여야 합니다' });
      }
      if (p.metrics.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['metrics'], message: '대표작은 근거가 있는 수치가 1개 이상 필요합니다' });
      }
      if (!p.brief) {
        ctx.addIssue({ code: 'custom', path: ['brief'], message: '대표작은 brief(문제·접근·결과 요약)가 필요합니다' });
      }
    }
    const isPrivate = p.repo?.visibility === 'private';
    p.metrics.forEach((m, i) => {
      if (typeof m.evidence !== 'string' && !isPrivate) {
        ctx.addIssue({
          code: 'custom',
          path: ['metrics', i, 'evidence'],
          message: '비공개 근거는 비공개 저장소 프로젝트에서만 쓸 수 있습니다',
        });
      }
    });
  });

export const contributionSchema = z
  .strictObject({
    repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'owner/repo 형식이어야 합니다'),
    kind: z.enum(['pr', 'issue']),
    number: z.number().int().positive(),
    title: z.string().min(1),
    state: z.enum(['open', 'merged', 'closed']),
    url: httpUrl,
    project: z.string().min(1),
    labels: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.kind === 'issue' && c.state === 'merged') {
      ctx.addIssue({ code: 'custom', path: ['state'], message: '이슈는 merged 상태일 수 없습니다' });
    }
    const expected = `https://github.com/${c.repo}/${c.kind === 'pr' ? 'pull' : 'issues'}/${c.number}`;
    if (c.url !== expected) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: `URL은 ${expected} 이어야 합니다` });
    }
  });

export const contributionsSchema = z.strictObject({
  asOf: z.coerce.date(),
  items: z.array(contributionSchema),
});

const experienceSchema = z.strictObject({
  org: z.string().min(1),
  product: z.string().min(1),
  period: periodSchema,
  role: z.string().min(1),
  employment: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  disclosure: z.literal('text-only'),
});

const activitySchema = z.strictObject({
  name: z.string().min(1),
  role: z.string().min(1),
  period: periodSchema,
  bullets: z.array(z.string().min(1)).default([]),
  links: z.array(linkSchema).default([]),
});

const educationSchema = z.strictObject({
  school: z.string().min(1),
  major: z.string().min(1),
  period: periodSchema,
  status: z.string().min(1),
});

const militarySchema = z.strictObject({
  period: periodSchema,
  status: z.string().min(1),
});

const highlightSchema = z.strictObject({
  label: z.string().min(1),
  detail: z.string().min(1),
  status: statusToneSchema,
  statusText: z.string().min(1),
  evidence: httpUrl,
});

const skillGroupSchema = z.strictObject({
  group: z.string().min(1),
  items: z
    .array(z.strictObject({ name: z.string().min(1), projects: z.array(z.string().min(1)).min(1) }))
    .min(1),
});

export const profileSchema = z.strictObject({
  name: z.string().min(1),
  nameEn: z.string().min(1),
  asOf: z.coerce.date(),
  headline: z.strictObject({ mark: z.string().min(1), rest: z.string().min(1) }),
  intro: z.array(z.string().min(1)).min(1).max(3),
  contact: z.strictObject({
    email: z.email().optional(),
    github: httpUrl,
    site: httpUrl.optional(),
  }),
  highlights: z.array(highlightSchema).min(3).max(4),
  education: z.array(educationSchema).min(1),
  military: militarySchema.optional(),
  experience: z.array(experienceSchema),
  activities: z.array(activitySchema),
  howIWork: z.strictObject({
    principles: z.array(z.strictObject({ title: z.string().min(1), body: z.string().min(1) })).min(1),
    evidence: z.array(linkSchema).min(1),
  }),
  skills: z.array(skillGroupSchema).min(1),
});

export type Project = z.infer<typeof projectSchema>;
export type Contribution = z.infer<typeof contributionSchema>;
export type Contributions = z.infer<typeof contributionsSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type Link = z.infer<typeof linkSchema>;
export type StatusTone = z.infer<typeof statusToneSchema>;
