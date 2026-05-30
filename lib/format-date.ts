/**
 * Supabase timestamptz는 UTC로 저장되지만,
 * 문자열에 Z/오프셋이 없으면 JS가 "로컬 시간"으로 해석해
 * (개발기 KST vs Vercel UTC) 표시가 어긋날 수 있음 → UTC로 고정 파싱.
 */
export function parseSupabaseUtcTimestamp(input: string): Date {
  const s = input.trim();
  if (!s) return new Date(NaN);

  // ISO 8601에 이미 Z 또는 ±오프셋이 있으면 표준 파싱
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    return new Date(s);
  }

  // "2026-03-24T05:32:00" / "2026-03-24 05:32:00.123" — 오프셋 없음 → UTC로 간주
  const isoMatch =
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(s);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}T${isoMatch[2]}Z`);
  }

  return new Date(s);
}

const KOREA_TIMEZONE = "Asia/Seoul";

/** Date | ISO 문자열 → KST 기준 YYYY-MM-DD */
export function toKoreaDateString(date: Date | string): string {
  const parsed =
    typeof date === "string" ? parseSupabaseUtcTimestamp(date) : date;
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIMEZONE,
  }).format(parsed);
}

/** 게시 시작일이 회원 등록일(가입일) 이후인지 — 과제 카운트 집계용 */
export function isAssignmentCountableAfterMemberRegistration(
  assignmentStartDate: string,
  memberRegisteredAt: string,
): boolean {
  const assignmentDay = toKoreaDateString(assignmentStartDate);
  const memberRegisteredDay = toKoreaDateString(memberRegisteredAt);
  if (!assignmentDay || !memberRegisteredDay) return false;
  return assignmentDay >= memberRegisteredDay;
}

/**
 * UTC 기준 시각을 한국 표준시로 표시 (날짜+시간 한 번에 포맷해 경계 불일치 방지)
 */
export function formatKoreaDateTimeFromUtc(input: string): string {
  const date = parseSupabaseUtcTimestamp(input);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).format(date);
}
