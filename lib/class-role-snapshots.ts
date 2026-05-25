import type { SupabaseClient } from "@supabase/supabase-js";

import { extractCourseShortLabel } from "@/lib/courses";
import {
  buildClassRolesStateFromStudents,
  type ClassRoleStudent,
  type ClassRolesState,
  type TeamRolesState,
} from "@/lib/class-officers";
import {
  computeMainEducationWeekNumber,
  getTodayDateStringInKorea,
  type CourseScheduleForTitle,
} from "@/lib/seating-chart-title";
import {
  parseTeamLeadersFromJson,
  parseTeamMembersFromJson,
} from "@/lib/apply-class-roles";

/** DB 레코드 */
export type ClassRoleSnapshotRecord = {
  id: string;
  title: string;
  group_name: string;
  class_president_id: string | null;
  team_leaders: Record<string, string> | null;
  team_members: Record<string, string[]> | null;
  team_count: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 목록·게시판용 */
export type ClassRoleSnapshotListItem = {
  id: string;
  title: string;
  groupName: string;
  teamCount: number;
  isActive: boolean;
  teamLeaderCount: number;
  teamMemberCount: number;
  createdAt: string;
};

/** 폼·상세용 */
export type ClassRoleSnapshotDetail = {
  id: string;
  title: string;
  groupName: string;
  teamCount: number;
  isActive: boolean;
  classPresidentId: string | null;
  teamLeaders: Record<number, string>;
  teamMembers: Record<number, string[]>;
  createdAt: string;
  updatedAt: string;
};

function parseSnapshotTeamState(
  record: ClassRoleSnapshotRecord,
): TeamRolesState {
  const teamLeaders = parseTeamLeadersFromJson(
    record.team_leaders ?? {},
    record.team_count,
  );
  const teamMembers = parseTeamMembersFromJson(
    record.team_members ?? {},
    record.team_count,
  );

  const teamLeadersRecord: Record<number, string> = {};
  for (const [team, userId] of teamLeaders) {
    teamLeadersRecord[team] = userId;
  }

  const teamMembersRecord: Record<number, string[]> = {};
  for (const [team, ids] of teamMembers) {
    teamMembersRecord[team] = ids;
  }

  return {
    classPresidentId: record.class_president_id,
    teamLeaders: teamLeadersRecord,
    teamMembers: teamMembersRecord,
    teamCount: record.team_count,
  };
}

export function snapshotRecordToRolesState(
  record: ClassRoleSnapshotRecord,
): ClassRolesState {
  return parseSnapshotTeamState(record);
}

export function snapshotRecordToTeamState(
  record: ClassRoleSnapshotRecord,
): TeamRolesState {
  return parseSnapshotTeamState(record);
}

export function toClassRoleSnapshotListItem(
  record: ClassRoleSnapshotRecord,
): ClassRoleSnapshotListItem {
  const teamLeaders = parseTeamLeadersFromJson(
    record.team_leaders ?? {},
    record.team_count,
  );
  const teamMembers = parseTeamMembersFromJson(
    record.team_members ?? {},
    record.team_count,
  );

  let memberCount = 0;
  for (const ids of teamMembers.values()) {
    memberCount += ids.length;
  }

  return {
    id: record.id,
    title: record.title,
    groupName: record.group_name,
    teamCount: record.team_count,
    isActive: record.is_active,
    teamLeaderCount: teamLeaders.size,
    teamMemberCount: memberCount,
    createdAt: record.created_at,
  };
}

export function toClassRoleSnapshotDetail(
  record: ClassRoleSnapshotRecord,
): ClassRoleSnapshotDetail {
  const teamState = parseSnapshotTeamState(record);
  return {
    id: record.id,
    title: record.title,
    groupName: record.group_name,
    teamCount: teamState.teamCount,
    isActive: record.is_active,
    classPresidentId: record.class_president_id,
    teamLeaders: teamState.teamLeaders,
    teamMembers: teamState.teamMembers,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** 신규 글 기본 제목 (예: 3기 5주차 조 편성) */
export function buildClassRoleDefaultTitle(
  groupName: string,
  schedule?: CourseScheduleForTitle,
  referenceDate = getTodayDateStringInKorea(),
): string {
  const cohortLabel = extractCourseShortLabel(groupName);
  if (
    schedule?.mainEducationStartDate &&
    schedule.mainEducationStartDate <= referenceDate
  ) {
    const week = computeMainEducationWeekNumber(
      schedule.mainEducationStartDate,
      referenceDate,
      schedule.holidayOptions,
    );
    return `${cohortLabel} ${week}주차 조 편성`;
  }
  const todayLabel = referenceDate.replaceAll("-", ".");
  return `${cohortLabel} 조 편성 (${todayLabel})`;
}

/** 학생 목록이 비어 있을 때 빈 상태 */
export function emptyClassRolesState(): ClassRolesState {
  return buildClassRolesStateFromStudents([] as ClassRoleStudent[]);
}

/** 스냅샷에 조장·조원이 한 명이라도 배정됐는지 */
export function recordHasTeamAssignments(
  record: Pick<
    ClassRoleSnapshotRecord,
    "team_leaders" | "team_members" | "team_count"
  >,
): boolean {
  const teamCount =
    typeof record.team_count === "number" ? record.team_count : 0;
  const teamLeaders = parseTeamLeadersFromJson(
    record.team_leaders ?? {},
    teamCount,
  );
  if (teamLeaders.size > 0) return true;

  const teamMembers = parseTeamMembersFromJson(
    record.team_members ?? {},
    teamCount,
  );
  for (const memberIds of teamMembers.values()) {
    if (memberIds.length > 0) return true;
  }
  return false;
}

/**
 * 과정에 적용 중인 반·조 글에 실제 조 편성이 있는지
 * (프로필 team_number만 있고 조 편성이 없으면 false)
 */
export async function isGroupTeamAssignmentActive(
  supabase: SupabaseClient,
  groupName: string | null | undefined,
): Promise<boolean> {
  const trimmedGroupName = groupName?.trim();
  if (!trimmedGroupName) return false;

  const { data, error } = await supabase
    .from("class_role_snapshots")
    .select("team_leaders, team_members, team_count")
    .eq("group_name", trimmedGroupName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("적용 중 반·조 글 조회 오류:", error);
    return false;
  }
  if (!data) return false;

  return recordHasTeamAssignments(
    data as Pick<
      ClassRoleSnapshotRecord,
      "team_leaders" | "team_members" | "team_count"
    >,
  );
}

/**
 * 여러 과정 중 적용 중인 조 편성이 실제로 있는 group_name 집합
 */
export async function getActiveTeamAssignmentGroupNames(
  supabase: SupabaseClient,
  groupNames: string[],
): Promise<Set<string>> {
  const trimmedGroupNames = [
    ...new Set(
      groupNames.map((name) => name?.trim()).filter((name): name is string => !!name),
    ),
  ];

  if (trimmedGroupNames.length === 0) return new Set();

  const { data, error } = await supabase
    .from("class_role_snapshots")
    .select("group_name, team_leaders, team_members, team_count")
    .eq("is_active", true)
    .in("group_name", trimmedGroupNames);

  if (error) {
    console.error("과정별 조 편성 활성 조회 오류:", error);
    return new Set();
  }

  const activeGroupNames = new Set<string>();
  for (const row of data ?? []) {
    const groupName = row.group_name?.trim();
    if (!groupName) continue;
    if (
      recordHasTeamAssignments(
        row as Pick<
          ClassRoleSnapshotRecord,
          "team_leaders" | "team_members" | "team_count"
        >,
      )
    ) {
      activeGroupNames.add(groupName);
    }
  }

  return activeGroupNames;
}
