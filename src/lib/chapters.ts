export interface Chapter {
  id: string;
  label: string;
}

// 홈의 장 목차. id는 홈 섹션의 id와 같다.
export const CHAPTERS: Chapter[] = [
  { id: 'ml', label: '정확성' },
  { id: 'agent-product', label: '에이전트·제품' },
  { id: 'experience', label: '경력' },
  { id: 'contact', label: '연락처' },
];
