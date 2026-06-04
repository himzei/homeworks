import type { TeamMemberEvaluation } from "@/lib/class-role-team-projects";

/** 팀 프로젝트 조원 평가 세부 항목 (각 0~20점) */
export const TEAM_PROJECT_EVALUATION_CRITERIA = [
  { key: "topic", label: "주제", maxScore: 20 },
  { key: "responsibility", label: "업무분장", maxScore: 20 },
  { key: "dataAnalysis", label: "데이터분석", maxScore: 20 },
  { key: "resultQuality", label: "결과도출", maxScore: 20 },
  { key: "explanation", label: "설명력", maxScore: 20 },
] as const;

export type TeamProjectCriterionKey =
  (typeof TEAM_PROJECT_EVALUATION_CRITERIA)[number]["key"];

export type ProjectScoreDetail = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
};

/** 조원 평가 → 세부 점수 목록 */
export function teamEvaluationToScoreDetails(
  evaluation: TeamMemberEvaluation,
): ProjectScoreDetail[] {
  return TEAM_PROJECT_EVALUATION_CRITERIA.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    score: evaluation[criterion.key],
    maxScore: criterion.maxScore,
  }));
}
