import { z } from 'astro/zod';
import { httpUrl } from './schema';

// 연출·시연에 쓰는 실제 데이터의 출처(설계 §7). 원본에 없는 값은 넣지 않는다.
export const sourceSchema = z.strictObject({
  url: httpUrl,
  sha: z.string().regex(/^[0-9a-f]{40}$/, '커밋 SHA는 40자리 16진수여야 합니다').optional(),
  lines: z.string().regex(/^L\d+(-L\d+)?$/, '줄 표기는 L10 또는 L10-L12 형식이어야 합니다').optional(),
  note: z.string().min(1).optional(),
});

export const provenanceSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1, '출처가 하나 이상 있어야 합니다'),
  extractedBy: z.string().min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '확인 날짜는 YYYY-MM-DD 형식이어야 합니다'),
});

export const heroSchema = z.strictObject({
  runs: z.strictObject({ approx: z.number().int().positive(), minutes: z.number().int().positive() }),
  sample: z
    .strictObject({
      issue: z.number().int().positive(),
      url: httpUrl,
      summary: z.string().min(1),
      code: z.string().min(1),
      eager: z.string().min(1),
      compiled: z.string().min(1),
      compiledLabel: z.string().min(1),
      env: z.string().min(1),
    })
    .refine((s) => s.eager !== s.compiled, { message: '히어로 예시는 두 결과가 달라야 합니다' })
    .refine((s) => s.url.endsWith(`/issues/${s.issue}`), { message: 'url과 이슈 번호가 맞지 않습니다' }),
  provenance: provenanceSchema,
});

export type Provenance = z.infer<typeof provenanceSchema>;
export type Hero = z.infer<typeof heroSchema>;
