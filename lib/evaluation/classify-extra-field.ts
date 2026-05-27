/** 추가 평가 필드 분류 (제목 기준 — 평가 탭과 동일 규칙) */
export type ExtraEvaluationFieldCategory = "exam" | "project" | "other";

/**
 * 필드 제목으로 시험/프로젝트 구분
 * - "시험", "중간시험" → exam
 * - "프로젝트", "최종프로젝트" → project
 */
export function classifyExtraFieldCategory(
  title: string,
): ExtraEvaluationFieldCategory {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return "other";

  if (trimmedTitle.includes("시험")) return "exam";
  if (trimmedTitle.includes("프로젝트")) return "project";

  return "other";
}
