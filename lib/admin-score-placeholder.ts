/** 관리자가 미제출 학생에게 점수만 줄 때 넣는 placeholder URL */
export const ADMIN_SCORE_PLACEHOLDER_URL = "admin://score-only";

/** 실제 학생 제출이 아닌 관리자 점수 전용 행인지 */
export function isAdminScoreOnlyHomeworkUrl(
  url: string | null | undefined,
): boolean {
  return (url ?? "").trim() === ADMIN_SCORE_PLACEHOLDER_URL;
}
