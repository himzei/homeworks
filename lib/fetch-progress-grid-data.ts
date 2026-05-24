import type { SupabaseClient } from "@supabase/supabase-js";

import { CLASS_OFFICER_ROLE } from "@/lib/class-officers";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import { LEGACY_GROUPS } from "@/lib/constants";
import { parseSupabaseUtcTimestamp } from "@/lib/format-date";

/** 진행과정 그리드용 과제 열 */
export type ProgressGridAssignment = {
  id: string;
  name: string;
};

/** 진행과정 그리드용 사용자 행 */
export type ProgressGridUser = {
  id: string;
  name: string;
  section: "your" | "everyone";
  classOfficerRole: string | null;
  teamNumber: number | null;
  isTeamLeader?: boolean;
  honorBadgeLabels?: string[];
};

/** 사용자·과제별 제출 상태 */
export type ProgressGridCell = {
  userId: string;
  assignmentId: string;
  status: "completed" | "not_completed";
  url?: string;
  evaluationStatus?: string;
};

export type ProgressGridData = {
  assignments: ProgressGridAssignment[];
  users: ProgressGridUser[];
  progressData: ProgressGridCell[];
};

type FetchProgressGridOptions = {
  /** null이면 전체 과정(관리자 '전체' 선택 시) */
  filterGroup: string | null;
  currentUserId: string;
};

/**
 * 과정(group_name) 필터가 레거시(13기)인지 여부
 * - 레거시: group_name이 null인 공통 과제도 포함
 */
function isLegacyCourseGroup(filterGroup: string): boolean {
  return LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number]);
}

/**
 * DB 쿼리용 group_name 필터 (PostgREST or/eq)
 */
function applyAssignmentsGroupFilter<
  T extends {
    or: (filters: string) => T;
    eq: (column: string, value: string) => T;
  },
>(query: T, filterGroup: string): T {
  if (isLegacyCourseGroup(filterGroup)) {
    const escapedGroupName = filterGroup.replace(/"/g, '""');
    return query.or(`group_name.is.null,group_name.eq."${escapedGroupName}"`);
  }
  return query.eq("group_name", filterGroup);
}

/**
 * 조회 결과를 메모리에서 한 번 더 걸러 과정 혼입 방지
 */
export function belongsToCourseGroup(
  groupName: string | null | undefined,
  filterGroup: string,
): boolean {
  const normalizedGroupName = groupName?.trim() || null;
  if (isLegacyCourseGroup(filterGroup)) {
    return normalizedGroupName === null || normalizedGroupName === filterGroup;
  }
  return normalizedGroupName === filterGroup;
}

/**
 * 진행과정(ProgressGrid)에 필요한 과제·학생·제출 데이터를 조회한다.
 * - 일반 사용자: filterGroup에 해당하는 과정만
 * - 관리자: filterGroup이 null이면 전체, 지정 시 해당 과정만
 */
export async function fetchProgressGridData(
  supabase: SupabaseClient,
  { filterGroup, currentUserId }: FetchProgressGridOptions,
): Promise<ProgressGridData> {
  const now = new Date();

  // assignments 조회
  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, title, start_date, group_name")
    .order("created_at", { ascending: false });

  if (filterGroup) {
    assignmentsQuery = applyAssignmentsGroupFilter(
      assignmentsQuery,
      filterGroup,
    );
  }

  const { data: assignmentsRaw, error: assignmentsError } =
    await assignmentsQuery;

  if (assignmentsError) {
    console.error("진행과정 과제 조회 오류:", assignmentsError);
  }

  // 게시 시작일 이후 과제만 그리드에 표시
  const assignments: ProgressGridAssignment[] = (assignmentsRaw ?? [])
    .filter((assignment) => {
      if (filterGroup && !belongsToCourseGroup(assignment.group_name, filterGroup)) {
        return false;
      }
      const startDate = parseSupabaseUtcTimestamp(assignment.start_date);
      return !Number.isNaN(startDate.getTime()) && now >= startDate;
    })
    .map((assignment) => ({
      id: assignment.id,
      name: assignment.title,
    }));

  // profiles 조회 (관리자 제외)
  let profilesQuery = supabase
    .from("profiles")
    .select("id, name, role, group_name, class_officer_role, team_number")
    .neq("role", "admin")
    .order("created_at", { ascending: true });

  if (filterGroup) {
    profilesQuery = profilesQuery.eq("group_name", filterGroup);
  }

  const { data: profilesRaw, error: profilesError } = await profilesQuery;

  if (profilesError) {
    console.error("진행과정 프로필 조회 오류:", profilesError);
  }

  const usersMapped: ProgressGridUser[] = (profilesRaw ?? [])
    .filter((profile) => {
      if (!filterGroup) return true;
      return belongsToCourseGroup(profile.group_name, filterGroup);
    })
    .map((profile) => ({
      id: profile.id,
      name: profile.name || profile.id,
      section:
        profile.id === currentUserId
          ? ("your" as const)
          : ("everyone" as const),
      classOfficerRole: profile.class_officer_role ?? null,
      teamNumber:
        typeof profile.team_number === "number" ? profile.team_number : null,
    }));

  const teamsWithTeamLeader = new Set<number>();
  for (const user of usersMapped) {
    if (
      user.classOfficerRole === CLASS_OFFICER_ROLE.TEAM_LEADER &&
      user.teamNumber
    ) {
      teamsWithTeamLeader.add(user.teamNumber);
    }
  }

  let users: ProgressGridUser[] = usersMapped.map((user) => {
    if (
      user.classOfficerRole !== CLASS_OFFICER_ROLE.CLASS_PRESIDENT ||
      !user.teamNumber ||
      teamsWithTeamLeader.has(user.teamNumber)
    ) {
      return user;
    }
    return { ...user, isTeamLeader: true };
  });

  const honorLabelsByProfileId = await fetchHonorBadgeLabelsByProfileId(
    supabase,
    users.map((u) => u.id),
  );

  users = users.map((user) => ({
    ...user,
    honorBadgeLabels: honorLabelsByProfileId[user.id] ?? [],
  }));

  const { data: allHomeworks, error: homeworksError } = await supabase
    .from("homeworks")
    .select("user_id, assignment_id, url, status");

  if (homeworksError) {
    console.error("진행과정 제출 상태 조회 오류:", homeworksError);
  }

  const userIdSet = new Set(users.map((user) => user.id));
  const assignmentIdSet = new Set(assignments.map((assignment) => assignment.id));

  const progressData: ProgressGridCell[] = [];

  for (const user of users) {
    for (const assignment of assignments) {
      const submission = (allHomeworks ?? []).find(
        (homework) =>
          homework.user_id === user.id &&
          homework.assignment_id === assignment.id,
      );

      progressData.push({
        userId: user.id,
        assignmentId: assignment.id,
        status: submission ? "completed" : "not_completed",
        url: submission?.url,
        evaluationStatus: submission?.status || undefined,
      });
    }
  }

  // 혹시 모를 교차 과정 데이터 제거 (방어적 필터)
  const safeProgressData = progressData.filter(
    (cell) =>
      userIdSet.has(cell.userId) && assignmentIdSet.has(cell.assignmentId),
  );

  return {
    assignments,
    users,
    progressData: safeProgressData,
  };
}
