/** 24시간 형식(HH:mm) 시간 문자열 유틸 */

const TIME_24H_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** 입력 중: 숫자와 콜론만 허용, 최대 5자 */
export function filterTime24Input(raw: string): string {
  return raw.replace(/[^\d:]/g, "").slice(0, 5);
}

/** HH:mm으로 정규화. 유효하지 않으면 null (예: 22:00) */
export function normalizeTime24(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(TIME_24H_REGEX);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Date → 로컬 24시간 HH:mm */
export function formatTime24FromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
