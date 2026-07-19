import { normalizeCriterionScores } from "@/lib/peer-evaluation/criteria";
import type {
  PeerEvaluationCriterion,
  PeerEvaluationEvaluateeSummary,
  PeerEvaluationRatingDetail,
} from "@/lib/peer-evaluation/types";

export type PeerEvaluationRatingInput = {
  id: string;
  evaluatorId: string;
  evaluateeId: string;
  score: number;
  criterionScores?: unknown;
  comment: string | null;
  createdAt: string;
};

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/** 평가 행 + 이름 맵 → 관리자용 집계 결과 */
export function aggregatePeerEvaluationResults(
  ratings: PeerEvaluationRatingInput[],
  nameById: Map<string, string>,
  criteria: PeerEvaluationCriterion[] = [],
): {
  summaries: PeerEvaluationEvaluateeSummary[];
  details: PeerEvaluationRatingDetail[];
  totalRatingCount: number;
} {
  if (ratings.length === 0) {
    return { summaries: [], details: [], totalRatingCount: 0 };
  }

  const scoresByEvaluatee = new Map<string, number[]>();
  const criterionScoresByEvaluatee = new Map<
    string,
    Map<string, number[]>
  >();

  for (const row of ratings) {
    const list = scoresByEvaluatee.get(row.evaluateeId) ?? [];
    list.push(row.score);
    scoresByEvaluatee.set(row.evaluateeId, list);

    const criterionScores = normalizeCriterionScores(row.criterionScores);
    let byCriterion = criterionScoresByEvaluatee.get(row.evaluateeId);
    if (!byCriterion) {
      byCriterion = new Map();
      criterionScoresByEvaluatee.set(row.evaluateeId, byCriterion);
    }

    for (const criterion of criteria) {
      const value = criterionScores[criterion.id];
      if (typeof value !== "number") continue;
      const values = byCriterion.get(criterion.id) ?? [];
      values.push(value);
      byCriterion.set(criterion.id, values);
    }
  }

  const summaries: PeerEvaluationEvaluateeSummary[] = [
    ...scoresByEvaluatee.entries(),
  ]
    .map(([evaluateeId, scores]) => {
      const byCriterion =
        criterionScoresByEvaluatee.get(evaluateeId) ?? new Map();
      const criterionAverages: Record<string, number | null> = {};
      for (const criterion of criteria) {
        criterionAverages[criterion.id] = averageOrNull(
          byCriterion.get(criterion.id) ?? [],
        );
      }

      return {
        evaluateeId,
        evaluateeName: nameById.get(evaluateeId) ?? "이름 없음",
        ratingCount: scores.length,
        averageScore: averageOrNull(scores),
        scores,
        criterionAverages,
      };
    })
    .toSorted((a, b) => {
      const avgDiff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
      if (avgDiff !== 0) return avgDiff;
      return a.evaluateeName.localeCompare(b.evaluateeName, "ko");
    });

  const details: PeerEvaluationRatingDetail[] = ratings
    .map((row) => ({
      id: row.id,
      evaluatorId: row.evaluatorId,
      evaluatorName: nameById.get(row.evaluatorId) ?? "이름 없음",
      evaluateeId: row.evaluateeId,
      evaluateeName: nameById.get(row.evaluateeId) ?? "이름 없음",
      score: row.score,
      criterionScores: normalizeCriterionScores(row.criterionScores),
      comment: row.comment,
      createdAt: row.createdAt,
    }))
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return {
    summaries,
    details,
    totalRatingCount: ratings.length,
  };
}
