import { z } from 'astro/zod';
import { httpUrl } from './schema';

const LINES = /^L(\d+)(?:-L(\d+))?$/;

// url의 # 뒤 조각(없으면 빈 글자). 형식이 틀린 url에서도 던지지 않도록 URL 객체 대신 글자로 자른다.
const fragment = (url: string) => (url.includes('#') ? url.slice(url.indexOf('#') + 1) : '');

// 연출·시연에 쓰는 실제 데이터의 출처(설계 §7). 원본에 없는 값은 넣지 않는다.
export const sourceSchema = z
  .strictObject({
    url: httpUrl,
    sha: z.string().regex(/^[0-9a-f]{40}$/, '커밋 SHA는 40자리 16진수여야 합니다').optional(),
    lines: z
      .string()
      .regex(/^L\d+(-L\d+)?$/, '줄 표기는 L10 또는 L10-L12 형식이어야 합니다')
      .superRefine((value, ctx) => {
        const m = LINES.exec(value);
        if (!m) return; // 형식 오류는 위 regex가 알린다
        const start = Number(m[1]);
        const end = m[2] === undefined ? start : Number(m[2]);
        if (start < 1) ctx.addIssue({ code: 'custom', message: '줄 번호는 1 이상이어야 합니다' });
        if (end < start) ctx.addIssue({ code: 'custom', message: '끝 줄은 시작 줄보다 앞설 수 없습니다' });
      })
      .optional(),
    note: z.string().min(1).optional(),
  })
  .superRefine((s, ctx) => {
    // sha와 줄 표기는 url과 같은 곳을 가리켜야 한다: 적어 둔 값과 실제 링크가 따로 놀지 않게 한다.
    if (s.sha !== undefined && !s.url.includes(s.sha)) {
      ctx.addIssue({ code: 'custom', path: ['sha'], message: 'url에 sha가 들어 있어야 합니다(커밋에 고정된 링크)' });
    }
    if (s.lines !== undefined && fragment(s.url) !== s.lines) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: `줄 표기는 url의 #조각(#${s.lines})과 같아야 합니다` });
    }
  });

export const provenanceSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1, '출처가 하나 이상 있어야 합니다'),
  extractedBy: z.string().min(1),
  verifiedAt: z.iso.date('확인 날짜는 달력에 있는 YYYY-MM-DD 형식이어야 합니다'),
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
