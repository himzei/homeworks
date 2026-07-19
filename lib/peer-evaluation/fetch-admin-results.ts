import type { SupabaseClient } from "@supabase/supabase-js";

import { aggregatePeerEvaluationResults } from "@/lib/peer-evaluation/aggregate-results";
import { normalizePeerEvaluationCriteria } from "@/lib/peer-evaluation/criteria";
import type {
  PeerEvaluationEvaluateeSummary,
  PeerEvaluationRatingDetail,
} from "@/lib/peer-evaluation/types";

type RatingRow = {
  id: string;
  evaluator_id: string;
  evaluatee_id: string;
  score: number;
  criterion_scores: unknown;
  comment: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
};

/** 관리자용 동료평가 결과 집계 */
export async function fetchPeerEvaluationAdminResults(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{
  summaries: PeerEvaluationEvaluateeSummary[];
  details: PeerEvaluationRatingDetail[];
  totalRatingCount: number;
}> {
  const [{ data: project }, { data: ratings, error }] = await Promise.all([
    supabase
      .from("peer_evaluation_projects")
      .select("criteria")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("peer_evaluation_ratings")
      .select(
        "id, evaluator_id, evaluatee_id, score, criterion_scores, comment, created_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (error) {
    console.error("동료평가 결과 조회 실패:", error);
    return { summaries: [], details: [], totalRatingCount: 0 };
  }

  const criteria = normalizePeerEvaluationCriteria(project?.criteria);
  const rows = (ratings ?? []) as RatingRow[];
  if (rows.length === 0) {
    return { summaries: [], details: [], totalRatingCount: 0 };
  }

  const profileIds = [
    ...new Set(rows.flatMap((row) => [row.evaluator_id, row.evaluatee_id])),
  ];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", profileIds);

  if (profilesError) {
    console.error("동료평가 결과 프로필 조회 실패:", profilesError);
  }

  const nameById = new Map<string, string>(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile.name?.trim() || "이름 없음",
    ]),
  );

  return aggregatePeerEvaluationResults(
    rows.map((row) => ({
      id: row.id,
      evaluatorId: row.evaluator_id,
      evaluateeId: row.evaluatee_id,
      score: row.score,
      criterionScores: row.criterion_scores,
      comment: row.comment,
      createdAt: row.created_at,
    })),
    nameById,
    criteria,
  );
}
