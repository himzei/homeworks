/** 과제 제출물 평가 상태 */
export type EvaluationStatus =
  | "미제출"
  | "검토중"
  | "수정필요"
  | "승인"
  | "모범답안";

/** 과제 점수 구간 — 기초과정(사전교육) / 본과정(본교육) */
export type HomeworkScorePhase = "foundation" | "main";

/** 기초과정: 모범 3, 승인 2, 미흡 1, 안함 0 */
const FOUNDATION_HOMEWORK_SCORES: Record<EvaluationStatus, number> = {
  미제출: 0,
  검토중: 0,
  수정필요: 1,
  승인: 2,
  모범답안: 3,
};

/** 본과정: 모범 5, 승인 4, 미흡 3, 안함 0 */
const MAIN_HOMEWORK_SCORES: Record<EvaluationStatus, number> = {
  미제출: 0,
  검토중: 0,
  수정필요: 3,
  승인: 4,
  모범답안: 5,
};

export const HOMEWORK_SCORES_BY_PHASE = {
  foundation: FOUNDATION_HOMEWORK_SCORES,
  main: MAIN_HOMEWORK_SCORES,
} as const;

/** @deprecated 본과정 기준 — 신규 코드는 phase 인자를 사용하세요 */
export const EVALUATION_SCORES = MAIN_HOMEWORK_SCORES;

/** 구간별 허용 입력 점수 */
export const ALLOWED_HOMEWORK_SCORES_BY_PHASE = {
  foundation: [0, 1, 2, 3] as const,
  main: [0, 3, 4, 5] as const,
};

export function getHomeworkScoreMap(
  phase: HomeworkScorePhase,
): Record<EvaluationStatus, number> {
  return HOMEWORK_SCORES_BY_PHASE[phase];
}

export function getAllowedHomeworkScores(
  phase: HomeworkScorePhase,
): readonly number[] {
  return ALLOWED_HOMEWORK_SCORES_BY_PHASE[phase];
}

export function getHomeworkScoreMax(phase: HomeworkScorePhase): number {
  const allowed = ALLOWED_HOMEWORK_SCORES_BY_PHASE[phase];
  return allowed[allowed.length - 1];
}

/**
 * 최종평가 만점(분모) — 하루(항목) 단위
 * - 기초과정: 2점 (승인 기준)
 * - 본과정: 4점 (승인 기준)
 */
export const HOMEWORK_FULL_SCORE_PER_DAY_BY_PHASE = {
  foundation: 2,
  main: 4,
} as const;

export function getHomeworkFullScorePerDay(
  phase: HomeworkScorePhase,
): number {
  return HOMEWORK_FULL_SCORE_PER_DAY_BY_PHASE[phase];
}

/** 항목 수 × 하루 만점 */
export function computeHomeworkSectionMaxScore(
  itemCount: number,
  phase: HomeworkScorePhase,
): number {
  if (itemCount <= 0) return 0;
  return itemCount * getHomeworkFullScorePerDay(phase);
}

/** DB status → 화면 점수 */
export function evaluationStatusToScore(
  status: EvaluationStatus | string | null | undefined,
  phase: HomeworkScorePhase = "main",
): number {
  const scores = getHomeworkScoreMap(phase);
  if (!status) return scores.검토중;
  if (status in scores) {
    return scores[status as EvaluationStatus];
  }
  return scores.검토중;
}

/** 입력 점수를 허용 값 중 가장 가까운 값으로 맞춤 */
export function snapAssignmentScore(
  score: number,
  phase: HomeworkScorePhase,
): number {
  const allowed = ALLOWED_HOMEWORK_SCORES_BY_PHASE[phase];
  const max = allowed[allowed.length - 1];
  const clamped = Math.min(max, Math.max(0, Math.round(score)));
  let nearest: number = allowed[0];
  let minDiff = Number.POSITIVE_INFINITY;
  for (const value of allowed) {
    const diff = Math.abs(value - clamped);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = value;
    }
  }
  return nearest;
}

/** 점수를 DB 저장용 상태로 변환 */
export function scoreToEvaluationStatus(
  score: number,
  phase: HomeworkScorePhase,
): Exclude<EvaluationStatus, "미제출"> {
  const snapped = snapAssignmentScore(score, phase);
  if (phase === "foundation") {
    if (snapped === 1) return "수정필요";
    if (snapped === 2) return "승인";
    if (snapped === 3) return "모범답안";
    return "검토중";
  }
  if (snapped === 3) return "수정필요";
  if (snapped === 4) return "승인";
  if (snapped === 5) return "모범답안";
  return "검토중";
}

/** 과제 시작일·본교육 시작일로 점수 구간 판별 */
export function resolveHomeworkScorePhase(
  assignmentStartDate: Date | string,
  mainEducationStartDate: string | null | undefined,
): HomeworkScorePhase {
  const mainStart = mainEducationStartDate?.trim();
  if (!mainStart) return "main";

  const assignmentDay = toKoreaDateString(assignmentStartDate);
  if (assignmentDay < mainStart) return "foundation";
  return "main";
}

function toKoreaDateString(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(parsed);
}
