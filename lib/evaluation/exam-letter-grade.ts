/** 시험·미니프로젝트 평가 등급 */
export const EXAM_LETTER_GRADES = ["A", "B", "C", "D", "F"] as const;

export type ExamLetterGrade = (typeof EXAM_LETTER_GRADES)[number];

/** 평가 항목 채점 방식 */
export const EXAM_SCORING_METHODS = ["score", "grade"] as const;

export type ExamScoringMethod = (typeof EXAM_SCORING_METHODS)[number];

export const EXAM_SCORING_METHOD_LABEL: Record<ExamScoringMethod, string> = {
  score: "점수 채점",
  grade: "등급 평가 (A~F)",
};

/** 등급 → 최종평가 합산용 점수 */
export const EXAM_LETTER_GRADE_SCORE: Record<ExamLetterGrade, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  F: 0,
};

export function isExamLetterGrade(value: unknown): value is ExamLetterGrade {
  return (
    typeof value === "string" &&
    (EXAM_LETTER_GRADES as readonly string[]).includes(value)
  );
}

export function isExamScoringMethod(value: unknown): value is ExamScoringMethod {
  return (
    typeof value === "string" &&
    (EXAM_SCORING_METHODS as readonly string[]).includes(value)
  );
}

/** DB/입력 값을 채점 방식으로 정규화 (없으면 score) */
export function parseExamScoringMethod(value: unknown): ExamScoringMethod {
  if (isExamScoringMethod(value)) return value;
  return "score";
}

/** DB/입력 값을 등급으로 정규화 (없으면 null) */
export function parseExamLetterGrade(value: unknown): ExamLetterGrade | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return isExamLetterGrade(trimmed) ? trimmed : null;
}

export function scoreFromExamLetterGrade(
  grade: ExamLetterGrade | null,
): number {
  if (!grade) return 0;
  return EXAM_LETTER_GRADE_SCORE[grade];
}

/** 레거시 숫자 점수만 있을 때 가까운 등급 추정 (없으면 null) */
export function inferExamLetterGradeFromScore(
  score: number | null | undefined,
): ExamLetterGrade | null {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return null;
  }
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  if (score > 0) return "F";
  return null;
}
