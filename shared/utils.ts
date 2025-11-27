/**
 * 공유 유틸리티 함수
 * 클라이언트와 서버 모두에서 사용 가능
 */

/**
 * 에러 객체에서 메시지 추출
 * @param error 에러 객체 (unknown 타입)
 * @returns 에러 메시지 문자열
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Date 객체를 KST(한국 시간, UTC+9)로 변환하여 "YYYY-MM-DD HH:MM:SS" 형식으로 포맷팅
 * @param date 변환할 Date 객체 (기본값: 현재 시간)
 * @returns 포맷팅된 날짜 문자열 (예: "2025-11-07 22:20:47")
 */
export function formatKSTDateTime(date: Date = new Date()): string {
  const kstOffset = 9 * 60; // KST는 UTC+9 (분 단위)
  const kstTime = new Date(date.getTime() + (kstOffset + date.getTimezoneOffset()) * 60000);
  
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getDate()).padStart(2, "0");
  const hours = String(kstTime.getHours()).padStart(2, "0");
  const minutes = String(kstTime.getMinutes()).padStart(2, "0");
  const seconds = String(kstTime.getSeconds()).padStart(2, "0");
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


