/** ISO 시각을 한국 시간(Asia/Seoul)의 YYYY-MM-DD로 바꾼다. 사이트의 formatDate와 같은 기준이지만 ICU로 따로 계산한다. */
export const kstDate = (iso: string): string => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
