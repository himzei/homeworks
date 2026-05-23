import type { SupabaseClient } from "@supabase/supabase-js";
import { LEGACY_GROUPS } from "@/lib/constants";

/** 오늘의 과제 목록에 사용하는 데이터 형태 */
export type TodayAssignmentData = {
  id: string;
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  lectureMaterialUrl: string | null;
  previousAnswerUrl: string | null;
};

type FetchTodayAssignmentsOptions = {
  /** 관리자 홈(/home) URL의 group 파라미터 */
  adminSelectedGroup?: string | null;
};

/**
 * 현재 진행 중(오늘)인 과제 목록 조회
 * - 로그인 사용자: 본인 과정(관리자는 선택 과정 또는 전체) 기준
 * - 비로그인: 빈 배열 (랜딩 페이지에 타 과정 과제 노출 방지)
 */
export async function fetchTodayAssignments(
  supabase: SupabaseClient,
  options: FetchTodayAssignmentsOptions = {},
): Promise<TodayAssignmentData[]> {
  const { adminSelectedGroup = null } = options;

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 비로그인 사용자에게는 과제를 노출하지 않음
  if (!currentUser?.id) {
    return [];
  }

  const currentUserId = currentUser.id;

  let isAdmin = false;
  let userGroupName: string | null = null;

  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role, group_name")
    .eq("id", currentUserId)
    .single();

  isAdmin = currentUserProfile?.role === "admin";
  userGroupName = currentUserProfile?.group_name?.trim() || null;

  const filterGroup =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : !isAdmin
        ? userGroupName
        : null;

  const isAdminExplicitGroup =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all";

  let assignmentsQuery = supabase
    .from("assignments")
    .select("*")
    .order("created_at", { ascending: false });

  if (filterGroup) {
    if (isAdminExplicitGroup) {
      if (LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number])) {
        const escaped = filterGroup.replace(/"/g, '""');
        assignmentsQuery = assignmentsQuery.or(
          `group_name.is.null,group_name.eq."${escaped}"`,
        );
      } else {
        assignmentsQuery = assignmentsQuery.eq("group_name", filterGroup);
      }
    } else {
      if (LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number])) {
        const escaped = filterGroup.replace(/"/g, '""');
        assignmentsQuery = assignmentsQuery.or(
          `group_name.is.null,group_name.eq."${escaped}"`,
        );
      } else {
        assignmentsQuery = assignmentsQuery.eq("group_name", filterGroup);
      }
    }
  }

  const { data: assignmentsData, error: assignmentsError } =
    await assignmentsQuery;

  if (assignmentsError) {
    console.error("오늘의 과제 조회 오류:", assignmentsError);
    return [];
  }

  const now = new Date();

  return (assignmentsData || [])
    .filter((assignment) => {
      const startDate = new Date(assignment.start_date);
      const endDate = new Date(assignment.end_date);
      return now >= startDate && now <= endDate;
    })
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      content: assignment.content || "",
      startDate: new Date(assignment.start_date),
      endDate: new Date(assignment.end_date),
      lectureMaterialUrl: assignment.lecture_material_url || null,
      previousAnswerUrl: assignment.previous_answer_url || null,
    }));
}
