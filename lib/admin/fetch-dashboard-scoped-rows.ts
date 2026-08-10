import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_SCORE_PLACEHOLDER_URL, isAdminScoreOnlyHomeworkUrl } from "@/lib/admin-score-placeholder";
import { fetchRowsWithChunkedInFilter } from "@/lib/supabase/chunked-in-filter";

export type DashboardHomeworkRow = {
  id: string;
  user_id: string;
  assignment_id: string;
  url: string;
  status: string;
  created_at: string;
};

export type DashboardConsultationRow = {
  id: string;
  student_id: string;
  content: string;
  status: string;
  created_at: string;
};

/**
 * 대시보드용 — 선택 과정 학생·과제 범위의 제출물만 조회 (전체 homeworks 스캔 방지)
 */
export async function fetchDashboardHomeworkRows(
  supabase: SupabaseClient,
  studentIds: string[],
  assignmentIds: string[],
): Promise<DashboardHomeworkRow[]> {
  if (studentIds.length === 0 || assignmentIds.length === 0) {
    return [];
  }

  const assignmentIdSet = new Set(assignmentIds);

  const rows = await fetchRowsWithChunkedInFilter<DashboardHomeworkRow>({
    supabase,
    table: "homeworks",
    select: "id, user_id, assignment_id, url, status, created_at",
    filterColumn: "user_id",
    filterValues: studentIds,
    extraInFilter: { column: "assignment_id", values: assignmentIds },
  });

  return rows.filter(
    (row) =>
      assignmentIdSet.has(row.assignment_id) &&
      !isAdminScoreOnlyHomeworkUrl(row.url),
  );
}

/** 검토 대기 제출물 건수 */
export async function countDashboardPendingHomeworks(
  supabase: SupabaseClient,
  studentIds: string[],
  assignmentIds: string[],
): Promise<number> {
  if (studentIds.length === 0 || assignmentIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("homeworks")
    .select("id", { count: "exact", head: true })
    .eq("status", "검토중")
    .neq("url", ADMIN_SCORE_PLACEHOLDER_URL)
    .in("user_id", studentIds)
    .in("assignment_id", assignmentIds);

  if (error) {
    console.error("대시보드 검토 대기 제출물 count 오류:", error);
    return 0;
  }

  return count ?? 0;
}

/** 검토 대기 제출물 최근 N건 */
export async function fetchDashboardPendingHomeworkList(
  supabase: SupabaseClient,
  studentIds: string[],
  assignmentIds: string[],
  limit: number,
): Promise<DashboardHomeworkRow[]> {
  if (studentIds.length === 0 || assignmentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("homeworks")
    .select("id, user_id, assignment_id, url, status, created_at")
    .eq("status", "검토중")
    .neq("url", ADMIN_SCORE_PLACEHOLDER_URL)
    .in("user_id", studentIds)
    .in("assignment_id", assignmentIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("대시보드 검토 대기 제출물 목록 오류:", error);
    return [];
  }

  return (data ?? []) as DashboardHomeworkRow[];
}

/** 답변 대기 상담 건수 */
export async function countDashboardPendingConsultations(
  supabase: SupabaseClient,
  studentIds: string[],
): Promise<number> {
  if (studentIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("consultations")
    .select("id", { count: "exact", head: true })
    .eq("status", "대기중")
    .in("student_id", studentIds);

  if (error) {
    console.error("대시보드 답변 대기 상담 count 오류:", error);
    return 0;
  }

  return count ?? 0;
}

/** 답변 대기 상담 최근 N건 */
export async function fetchDashboardPendingConsultationList(
  supabase: SupabaseClient,
  studentIds: string[],
  limit: number,
): Promise<DashboardConsultationRow[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("consultations")
    .select("id, student_id, content, status, created_at")
    .eq("status", "대기중")
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("대시보드 답변 대기 상담 목록 오류:", error);
    return [];
  }

  return (data ?? []) as DashboardConsultationRow[];
}
