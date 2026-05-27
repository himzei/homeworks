/** 과제 제출물 평가 상태 */
export type EvaluationStatus =
  | "미제출"
  | "검토중"
  | "수정필요"
  | "승인"
  | "모범답안";

/** 평가 상태별 점수 (과제 평가 그리드와 동일) */
export const EVALUATION_SCORES: Record<EvaluationStatus, number> = {
  미제출: 0,
  검토중: 0,
  수정필요: 7,
  승인: 10,
  모범답안: 13,
};

/** DB status → 화면 점수 */
export function evaluationStatusToScore(
  status: EvaluationStatus | string | null | undefined,
): number {
  if (!status) return EVALUATION_SCORES.검토중;
  if (status in EVALUATION_SCORES) {
    return EVALUATION_SCORES[status as EvaluationStatus];
  }
  return EVALUATION_SCORES.검토중;
}
