export interface Chapter {
  id: string;
  label: string;
}

// 홈의 장 목차. id는 홈 섹션의 id와 같다.
export const CHAPTERS: Chapter[] = [
  { id: 'oss', label: '오픈소스' },
  { id: 'personal', label: '개인 프로젝트' },
  { id: 'experience', label: '경력' },
  { id: 'contact', label: '연락처' },
];
