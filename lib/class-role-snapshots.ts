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
