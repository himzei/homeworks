/** 추가 평가 필드 분류 (제목 기준 — 평가 탭과 동일 규칙) */
export type ExtraEvaluationFieldCategory = "exam" | "project" | "other";

/**
 * 필드 제목으로 시험/프로젝트 구분
 * - "시험", "중간시험" → exam (시험평가 섹션)
 * - "미니프로젝트" → exam (시험평가 섹션)
 * - "프로젝트", "최종프로젝트" → project (프로젝트 평가 섹션)
 * - 그 외 추가 필드 → other (과제평가 섹션)
 */
export function classifyExtraFieldCategory(
  title: string,
): ExtraEvaluationFieldCategory {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return "other";

  // 공백 제거 후 미니프로젝트 먼저 판별 (일반 "프로젝트"보다 우선)
  const compactTitle = trimmedTitle.replace(/\s+/g, "");
  if (compactTitle.includes("미니프로젝트")) return "exam";
  if (trimmedTitle.includes("시험")) return "exam";
  if (trimmedTitle.includes("프로젝트")) return "project";

  return "other";
}

/** 시험평가 및 미니프로젝트평가 탭에 표시할 필드인지 */
export function isExamOrMiniProjectFieldTitle(title: string): boolean {
  return classifyExtraFieldCategory(title) === "exam";
}
