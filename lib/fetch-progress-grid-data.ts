import type { SupabaseClient } from "@supabase/supabase-js";

import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

import {
  parseTeamLeadersFromJson,
  parseTeamMembersFromJson,
} from "@/lib/apply-class-roles";
import { CLASS_OFFICER_ROLE } from "@/lib/class-officers";
import { getActiveTeamAssignmentGroupNames } from "@/lib/class-role-snapshots";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import { LEGACY_GROUPS } from "@/lib/constants";
import { parseSupabaseUtcTimestamp } from "@/lib/format-date";
import { fetchRowsWithChunkedInFilter } from "@/lib/supabase/chunked-in-filter";

type ProgressHomeworkRow = {
  user_id: string;
  assignment_id: string;
  url: string;
  status: string | null;
};

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

type ActiveClassRoleSnapshotRow = {
  class_president_id: string | null;
  team_leaders: Record<string, string | null> | null;
  team_members: Record<string, string[] | null> | null;
  team_count: number | null;
};

/** 스냅샷 1건 기준 반장 역할·조 정보 보강 (조가 없어도 반장 배지는 표시) */
function applyPresidentFromSnapshotRow(
  users: ProgressGridUser[],
  snapshot: ActiveClassRoleSnapshotRow,
): ProgressGridUser[] {
  const presidentId = snapshot.class_president_id;
  if (!presidentId) {
    return users;
  }

  const teamCount =
    typeof snapshot.team_count === "number" && snapshot.team_count > 0
      ? snapshot.team_count
      : 20;
  const teamLeaders = parseTeamLeadersFromJson(
    snapshot.team_leaders,
    teamCount,
  );
  const teamMembers = parseTeamMembersFromJson(
    snapshot.team_members,
    teamCount,
  );

  let presidentTeamNumber: number | null = null;
  let presidentIsTeamLeader = false;

  for (const [teamNumber, leaderId] of teamLeaders.entries()) {
    if (leaderId === presidentId) {
      presidentTeamNumber = teamNumber;
      presidentIsTeamLeader = true;
      break;
    }
  }

  if (presidentTeamNumber === null) {
    for (const [teamNumber, memberIds] of teamMembers.entries()) {
      if (memberIds.includes(presidentId)) {
        presidentTeamNumber = teamNumber;
        break;
      }
    }
  }

  return users.map((user) => {
    if (user.id !== presidentId) {
      return user;
    }

    return {
      ...user,
      classOfficerRole: CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
      teamNumber: user.teamNumber ?? presidentTeamNumber,
      isTeamLeader: user.isTeamLeader ?? presidentIsTeamLeader,
    };
  });
}

/** 조 편성이 없을 때 조·조장 배지만 제거 (반장·명예 배지는 유지, 반장의 조 정보는 유지) */
function stripTeamBadgesFromProgressUser(
  user: ProgressGridUser,
): ProgressGridUser {
  const isClassPresident =
    user.classOfficerRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT;

  return {
    ...user,
    classOfficerRole: isClassPresident
      ? CLASS_OFFICER_ROLE.CLASS_PRESIDENT
      : null,
    teamNumber: isClassPresident ? user.teamNumber : null,
    isTeamLeader: isClassPresident ? user.isTeamLeader : false,
  };
}

/**
 * 진행과정(ProgressGrid)에 필요한 과제·학생·제출 데이터를 조회한다.
 * - 일반 사용자: filterGroup에 해당하는 과정만
 * - 관리자: filterGroup이 null이면 전체, 지정 시 해당 과정만
 */
async function fetchHomeworksForProgressGrid(
  supabase: SupabaseClient,
  userIds: string[],
  assignmentIds: string[],
): Promise<ProgressHomeworkRow[]> {
  if (userIds.length === 0 || assignmentIds.length === 0) {
    return [];
  }

  const assignmentIdSet = new Set(assignmentIds);

  const rows = await fetchRowsWithChunkedInFilter<ProgressHomeworkRow>({
    supabase,
    table: "homeworks",
    select: "user_id, assignment_id, url, status",
    filterColumn: "user_id",
    filterValues: userIds,
    extraInFilter: { column: "assignment_id", values: assignmentIds },
  });

  return rows.filter((row) => assignmentIdSet.has(row.assignment_id));
}

export async function fetchProgressGridData(
  supabase: SupabaseClient,
  { filterGroup, currentUserId }: FetchProgressGridOptions,
): Promise<ProgressGridData> {
  const now = new Date();

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

  let profilesQuery = supabase
    .from("profiles")
    .select("id, name, role, group_name, class_officer_role, team_number")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
    .eq("is_dormant", false)
    .order("created_at", { ascending: true });

  if (filterGroup) {
    profilesQuery = profilesQuery.eq("group_name", filterGroup);
  }

  const snapshotsQuery = filterGroup
    ? supabase
        .from("class_role_snapshots")
        .select(
          "class_president_id, team_leaders, team_members, team_count",
        )
        .eq("group_name", filterGroup)
        .eq("is_active", true)
        .maybeSingle()
    : supabase
        .from("class_role_snapshots")
        .select(
          "group_name, class_president_id, team_leaders, team_members, team_count",
        )
        .eq("is_active", true);

  const [assignmentsResult, profilesResult, snapshotsResult] = await Promise.all([
    assignmentsQuery,
    profilesQuery,
    snapshotsQuery,
  ]);

  if (assignmentsResult.error) {
    console.error("진행과정 과제 조회 오류:", assignmentsResult.error);
  }

  const assignmentsRaw = assignmentsResult.data;

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

  if (profilesResult.error) {
    console.error("진행과정 프로필 조회 오류:", profilesResult.error);
  }

  const profilesRaw = profilesResult.data;

  const filteredProfiles = (profilesRaw ?? []).filter((profile) => {
    if (!filterGroup) return true;
    return belongsToCourseGroup(profile.group_name, filterGroup);
  });

  const profileGroupNameById: Record<string, string | null> = {};
  for (const profile of filteredProfiles) {
    profileGroupNameById[profile.id] = profile.group_name?.trim() || null;
  }

  const usersMapped: ProgressGridUser[] = filteredProfiles.map((profile) => ({
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

  if (filterGroup) {
    const snapshotRow = snapshotsResult.data;
    if (snapshotRow && !snapshotsResult.error) {
      users = applyPresidentFromSnapshotRow(
        users,
        snapshotRow as ActiveClassRoleSnapshotRow,
      );
    }
  } else if (Array.isArray(snapshotsResult.data) && snapshotsResult.data.length > 0) {
    for (const snapshot of snapshotsResult.data) {
      if (!snapshot.class_president_id) continue;
      users = applyPresidentFromSnapshotRow(
        users,
        snapshot as ActiveClassRoleSnapshotRow,
      );
    }
  }

  const groupNamesForTeamBadges = filterGroup
    ? [filterGroup]
    : [
        ...new Set(
          Object.values(profileGroupNameById).filter(
            (name): name is string => !!name,
          ),
        ),
      ];

  const userIds = users.map((user) => user.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [activeTeamAssignmentGroups, honorLabelsByProfileId, allHomeworks] =
    await Promise.all([
      getActiveTeamAssignmentGroupNames(supabase, groupNamesForTeamBadges),
      fetchHonorBadgeLabelsByProfileId(
        supabase,
        userIds,
        filterGroup
          ? { groupName: filterGroup }
          : { profileGroupNameById: profileGroupNameById },
      ),
      fetchHomeworksForProgressGrid(supabase, userIds, assignmentIds),
    ]);

  users = users.map((user) => {
    const userGroupName = profileGroupNameById[user.id];
    const showTeamBadges =
      !!userGroupName && activeTeamAssignmentGroups.has(userGroupName);
    const withTeamBadges = showTeamBadges
      ? user
      : stripTeamBadgesFromProgressUser(user);
    return {
      ...withTeamBadges,
      honorBadgeLabels: honorLabelsByProfileId[user.id] ?? [],
    };
  });

  const submissionByUserAssignment = new Map<
    string,
    ProgressHomeworkRow
  >();
  for (const homework of allHomeworks) {
    submissionByUserAssignment.set(
      `${homework.user_id}:${homework.assignment_id}`,
      homework,
    );
  }

  const userIdSet = new Set(userIds);
  const assignmentIdSet = new Set(assignmentIds);

  const progressData: ProgressGridCell[] = [];

  for (const user of users) {
    for (const assignment of assignments) {
      const submission = submissionByUserAssignment.get(
        `${user.id}:${assignment.id}`,
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
