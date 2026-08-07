import type { SupabaseClient } from "@supabase/supabase-js";

/** 동료평가 프로젝트 1건에서 학생이 받은 점수 */
export type PeerEvaluationScoreItem = {
  key: string;
  dateLabel: string;
  title: string;
  /** 받은 점수 평균 (소수 1자리) */
  score: number;
  /** 이 프로젝트에서 학생이 받은 평가 건수 */
  ratingCount: number;
  /** 해당 프로젝트 내 기수 등수 (평가 0건이면 null) */
  rank: number | null;
  /** 해당 프로젝트 등수 산정 대상 학생 수 */
  rankedStudentCount: number;
};

/** 학생 1명이 받은 동료평가 집계 */
export type StudentPeerEvaluation = {
  /** 프로젝트별 평균 점수의 합 */
  totalScore: number;
  /** 받은 점수 전체 평균 (평가가 없으면 null) */
  averageScore: number | null;
  /** 받은 평가 총 건수 */
  ratingCount: number;
  /** 기수 내 평균 점수 등수 (동점은 같은 등수, 평가가 없으면 null) */
  rank: number | null;
  /** 등수 산정 대상 학생 수 (평가를 받은 학생만 집계) */
  rankedStudentCount: number;
  items: PeerEvaluationScoreItem[];
};

type ProjectRow = {
  id: string;
  title: string | null;
  created_at: string;
};

type RatingRow = {
  project_id: string;
  evaluatee_id: string;
  score: number | null;
};

/** 소수 1자리 반올림 (0.1 단위 오차 방지) */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatProjectDateLabel(createdAt: string): string {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return createdAt.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    parsed,
  );
}

/** 평가 이력이 없는 학생용 빈 집계 */
export function createEmptyPeerEvaluation(): StudentPeerEvaluation {
  return {
    totalScore: 0,
    averageScore: null,
    ratingCount: 0,
    rank: null,
    rankedStudentCount: 0,
    items: [],
  };
}

/**
 * 점수 내림차순 등수 부여 (동점은 같은 등수, 다음 등수는 건너뜀)
 * entries의 score가 null이면 제외
 */
function buildRankByKey(
  entries: Array<{ key: string; score: number }>,
): Map<string, { rank: number; rankedStudentCount: number }> {
  const result = new Map<string, { rank: number; rankedStudentCount: number }>();
  if (entries.length === 0) return result;

  const sorted = entries.toSorted(
    (entryA, entryB) => entryB.score - entryA.score,
  );
  const rankedStudentCount = sorted.length;

  let previousScore: number | null = null;
  let previousRank = 0;

  sorted.forEach((entry, index) => {
    const rank =
      previousScore !== null && entry.score === previousScore
        ? previousRank
        : index + 1;

    previousScore = entry.score;
    previousRank = rank;
    result.set(entry.key, { rank, rankedStudentCount });
  });

  return result;
}

/**
 * 전체 평균 등수 + 프로젝트별 등수 부여
 * - 전체: 평가를 받은 학생만 (averageScore !== null)
 * - 프로젝트: 해당 프로젝트에서 평가를 1건 이상 받은 학생만
 */
function assignPeerEvaluationRanks(
  scoresByStudentId: Map<string, StudentPeerEvaluation>,
): void {
  const overallRankByStudentId = buildRankByKey(
    [...scoresByStudentId.entries()].flatMap(([studentId, evaluation]) =>
      evaluation.averageScore === null
        ? []
        : [{ key: studentId, score: evaluation.averageScore }],
    ),
  );

  for (const [studentId, evaluation] of scoresByStudentId) {
    const overall = overallRankByStudentId.get(studentId);
    if (!overall) continue;
    evaluation.rank = overall.rank;
    evaluation.rankedStudentCount = overall.rankedStudentCount;
  }

  // 프로젝트 키별 학생 점수 모아서 프로젝트 단위 등수 계산
  const scoresByItemKey = new Map<
    string,
    Array<{ studentId: string; score: number }>
  >();

  for (const [studentId, evaluation] of scoresByStudentId) {
    for (const item of evaluation.items) {
      if (item.ratingCount <= 0) continue;
      const list = scoresByItemKey.get(item.key) ?? [];
      list.push({ studentId, score: item.score });
      scoresByItemKey.set(item.key, list);
    }
  }

  for (const [itemKey, studentScores] of scoresByItemKey) {
    const rankByStudentId = buildRankByKey(
      studentScores.map((entry) => ({
        key: entry.studentId,
        score: entry.score,
      })),
    );

    for (const [studentId, evaluation] of scoresByStudentId) {
      const item = evaluation.items.find(
        (candidate) => candidate.key === itemKey,
      );
      if (!item) continue;
      const ranked = rankByStudentId.get(studentId);
      if (!ranked) continue;
      item.rank = ranked.rank;
      item.rankedStudentCount = ranked.rankedStudentCount;
    }
  }
}

/**
 * 기수 학생들이 받은 동료평가 점수를 프로젝트별로 집계
 * - 준비중(draft) 프로젝트는 제외
 * - 평가를 받지 못한 프로젝트도 0점 항목으로 포함해 학생 간 표 열을 맞춤
 */
export async function fetchPeerEvaluationScoresByStudent(
  supabase: SupabaseClient,
  groupName: string,
  studentIds: string[],
): Promise<Map<string, StudentPeerEvaluation>> {
  const scoresByStudentId = new Map<string, StudentPeerEvaluation>();
  if (studentIds.length === 0) return scoresByStudentId;

  const { data: projectRows, error: projectsError } = await supabase
    .from("peer_evaluation_projects")
    .select("id, title, created_at")
    .eq("group_name", groupName)
    .in("status", ["open", "closed"])
    .order("created_at", { ascending: true });

  if (projectsError) {
    console.error("최종 평가 동료평가 프로젝트 조회 실패:", projectsError);
    return scoresByStudentId;
  }

  const projects = (projectRows ?? []) as ProjectRow[];
  if (projects.length === 0) return scoresByStudentId;

  const { data: ratingRows, error: ratingsError } = await supabase
    .from("peer_evaluation_ratings")
    .select("project_id, evaluatee_id, score")
    .in(
      "project_id",
      projects.map((project) => project.id),
    )
    .in("evaluatee_id", studentIds);

  if (ratingsError) {
    console.error("최종 평가 동료평가 점수 조회 실패:", ratingsError);
    return scoresByStudentId;
  }

  // key: `${studentId}:${projectId}` → 합계·건수
  const totalsByStudentProject = new Map<
    string,
    { sum: number; count: number }
  >();

  for (const row of (ratingRows ?? []) as RatingRow[]) {
    if (typeof row.score !== "number") continue;
    const key = `${row.evaluatee_id}:${row.project_id}`;
    const current = totalsByStudentProject.get(key) ?? { sum: 0, count: 0 };
    current.sum += row.score;
    current.count += 1;
    totalsByStudentProject.set(key, current);
  }

  for (const studentId of studentIds) {
    const items: PeerEvaluationScoreItem[] = [];
    let ratingCount = 0;
    let scoreSum = 0;

    for (const project of projects) {
      const aggregate = totalsByStudentProject.get(
        `${studentId}:${project.id}`,
      );
      const average = aggregate?.count
        ? roundToOneDecimal(aggregate.sum / aggregate.count)
        : 0;

      items.push({
        key: `peer-${project.id}`,
        dateLabel: formatProjectDateLabel(project.created_at),
        title: (project.title ?? "").trim() || "동료평가",
        score: average,
        ratingCount: aggregate?.count ?? 0,
        rank: null,
        rankedStudentCount: 0,
      });

      ratingCount += aggregate?.count ?? 0;
      scoreSum += aggregate?.sum ?? 0;
    }

    const totalScore = roundToOneDecimal(
      items.reduce((sum, item) => sum + item.score, 0),
    );

    scoresByStudentId.set(studentId, {
      totalScore,
      averageScore:
        ratingCount > 0 ? roundToOneDecimal(scoreSum / ratingCount) : null,
      ratingCount,
      rank: null,
      rankedStudentCount: 0,
      items,
    });
  }

  assignPeerEvaluationRanks(scoresByStudentId);

  return scoresByStudentId;
}
