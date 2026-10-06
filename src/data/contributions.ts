import { contributionsSchema } from '../lib/schema';
import raw from './contributions.json';

// 매일 GitHub Actions(scripts/refresh-contributions.ts)가 상태를 갱신한다(설계 2026-10-06 §4).
// 사람이 관리하는 필드는 project·note·related(번호)·ignore·excludeOwners뿐이다.
export const contributions = contributionsSchema.parse(raw);
