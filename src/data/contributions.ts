import { contributionsSchema } from '../lib/schema';
// Playwright(Node ESM)가 e2e 시험에서 profile을 거쳐 이 파일을 읽으므로, JSON 가져오기에는 속성을 붙인다.
import raw from './contributions.json' with { type: 'json' };

// 매일 GitHub Actions(scripts/refresh-contributions.ts)가 상태를 갱신한다(설계 2026-10-06 §4).
// 사람이 관리하는 필드는 project·note·related(번호)·ignore·excludeOwners뿐이다.
export const contributions = contributionsSchema.parse(raw);
