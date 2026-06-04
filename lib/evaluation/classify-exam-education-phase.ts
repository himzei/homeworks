/** 시험(추가 평가) 필드의 사전·본교육 구간 */
export type ExamEducationPhase = "pre" | "main";

/**
 * 시험 필드가 사전교육/본교육 중 어디에 속하는지 판별
 * - 제목에 '사전' → 사전교육
 * - 제목에 '본', '중간', '기말' → 본교육
 * - field_date가 본교육 시작일 이전이면 사전, 이후면 본
 * - 판별 불가 시 본교육으로 분류
 */
export function classifyExamEducationPhase(
  title: string,
  fieldDate: string | null | undefined,
  mainEducationStartDate: string | null | undefined,
): ExamEducationPhase {
  const trimmedTitle = title.trim();
  if (trimmedTitle.includes("사전")) return "pre";
  if (
    trimmedTitle.includes("본") ||
    trimmedTitle.includes("중간") ||
    trimmedTitle.includes("기말")
  ) {
    return "main";
  }

  const mainStart = mainEducationStartDate?.trim().slice(0, 10);
  const fieldDay = fieldDate?.trim().slice(0, 10);
  if (mainStart && fieldDay) {
    return fieldDay < mainStart ? "pre" : "main";
  }

  return "main";
}
