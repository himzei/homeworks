import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseTeamLeadersFromJson,
  parseTeamMembersFromJson,
} from "@/lib/apply-class-roles";
import {
  buildClassRolesStateFromStudents,
  CLASS_OFFICER_ROLE,
  fetchClassRoleStudents,
  type ClassOfficerRole,
  type ClassRoleStudent,
} from "@/lib/class-officers";
import {
  isGroupTeamAssignmentActive,
  recordHasTeamAssignments,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import {
  parseTeamProjectsFromJson,
  type TeamProjectInfo,
} from "@/lib/class-role-team-projects";
import { extractCourseShortLabel } from "@/lib/courses";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";

/** 학습현황 — 조원·조장 한 명 */
export type LearningStatusTeamMember = {
  id: string;
  name: string;
  classOfficerRole: ClassOfficerRole | null;
  teamNumber: number;
  /** 반장이 해당 조 조장인 경우 */
  isTeamLeader?: boolean;
  honorBadgeLabels: string[];
  /** 업무 분장 */
  workAssignment: string;
};

/** 학습현황 — 팀 프로젝트 정보 */
export type LearningStatusTeamProject = {
  snapshotId: string;
  teamNumber: number;
  topic: string;
  githubUrl: string;
  deployUrl: string;
  projectEvaluationDate: string | null;
  pptFileName: string | null;
  hasPptAttachment: boolean;
};

/** 학습현황 — 내가 속한 조 */
export type LearningStatusMyTeam = {
  teamNumber: number;
  leader: LearningStatusTeamMember | null;
  members: LearningStatusTeamMember[];
  project: LearningStatusTeamProject | null;
};

/** 학습현황 — 과거 조 편성 (조 변경 후에만 표시) */
export type LearningStatusTeamHistoryEntry = {
  snapshotId: string;
  snapshotTitle: string;
  archivedAt: string;
  team: LearningStatusMyTeam;
};

/** 학습현황 — 팀 구성 전체 */
export type LearningStatusTeamComposition = {
  courseGroupName: string | null;
  cohortLabel: string | null;
  isTeamAssignmentActive: boolean;
  activeSnapshotTitle: string | null;
  currentUserId: string;
  currentUserTeamNumber: number | null;
  myTeam: LearningStatusMyTeam | null;
  teamHistory: LearningStatusTeamHistoryEntry[];
};

type SnapshotTeamAssignment = {
  snapshotId: string;
  snapshotTitle: string;
  archivedAt: string;
  classPresidentId: string | null;
  teamLeaders: Record<number, string>;
  teamMembers: Record<number, string[]>;
  teamCount: number;
  teamProjects: Record<number, TeamProjectInfo>;
  projectEvaluationDate: string | null;
};

function toTeamMember(
  memberId: string,
  teamNumber: number,
  studentById: Map<string, ClassRoleStudent>,
  nameById: Map<string, string>,
  honorLabels: Record<string, string[]>,
  classPresidentId: string | null,
  workAssignment: string,
  options?: { asLeader?: boolean },
): LearningStatusTeamMember {
  const student = studentById.get(memberId);
  const isPresident = memberId === classPresidentId;
  const asLeader = options?.asLeader ?? false;
  const resolvedName =
    student?.name?.trim() ||
    nameById.get(memberId)?.trim() ||
    "(알 수 없음)";

  let classOfficerRole: ClassOfficerRole | null = null;
  if (isPresident) {
    classOfficerRole = CLASS_OFFICER_ROLE.CLASS_PRESIDENT;
  } else if (asLeader) {
    classOfficerRole = CLASS_OFFICER_ROLE.TEAM_LEADER;
  }

  return {
    id: memberId,
    name: resolvedName,
    classOfficerRole,
    teamNumber,
    ...(isPresident && asLeader ? { isTeamLeader: true } : {}),
    honorBadgeLabels: honorLabels[memberId] ?? [],
    workAssignment,
  };
}

function findUserTeamNumberInSnapshot(
  userId: string,
  teamLeaders: Record<number, string>,
  teamMembers: Record<number, string[]>,
  teamCount: number,
): number | null {
  for (let teamNumber = 1; teamNumber <= teamCount; teamNumber++) {
    if (teamLeaders[teamNumber] === userId) {
      return teamNumber;
    }
    if ((teamMembers[teamNumber] ?? []).includes(userId)) {
      return teamNumber;
    }
  }
  return null;
}

function parseSnapshotTeamAssignment(
  record: Pick<
    ClassRoleSnapshotRecord,
    | "id"
    | "title"
    | "updated_at"
    | "class_president_id"
    | "team_leaders"
    | "team_members"
    | "team_count"
    | "team_projects"
    | "project_evaluation_date"
  >,
): SnapshotTeamAssignment {
  const teamCount =
    typeof record.team_count === "number" ? record.team_count : 0;
  const teamLeadersMap = parseTeamLeadersFromJson(
    record.team_leaders ?? {},
    teamCount,
  );
  const teamMembersMap = parseTeamMembersFromJson(
    record.team_members ?? {},
    teamCount,
  );

  const teamLeaders: Record<number, string> = {};
  for (const [teamNumber, leaderId] of teamLeadersMap) {
    teamLeaders[teamNumber] = leaderId;
  }

  const teamMembers: Record<number, string[]> = {};
  for (const [teamNumber, memberIds] of teamMembersMap) {
    teamMembers[teamNumber] = memberIds;
  }

  return {
    snapshotId: record.id,
    snapshotTitle: record.title?.trim() || "조 편성",
    archivedAt: record.updated_at,
    classPresidentId: record.class_president_id,
    teamLeaders,
    teamMembers,
    teamCount,
    teamProjects: parseTeamProjectsFromJson(record.team_projects ?? {}),
    projectEvaluationDate:
      typeof record.project_evaluation_date === "string"
        ? record.project_evaluation_date
        : null,
  };
}

function buildTeamProject(
  snapshot: Pick<
    SnapshotTeamAssignment,
    "snapshotId" | "projectEvaluationDate" | "teamProjects"
  >,
  teamNumber: number,
): LearningStatusTeamProject {
  const project = snapshot.teamProjects[teamNumber];

  return {
    snapshotId: snapshot.snapshotId,
    teamNumber,
    topic: project?.topic.trim() ?? "",
    githubUrl: project?.githubUrl.trim() ?? "",
    deployUrl: project?.deployUrl.trim() ?? "",
    projectEvaluationDate: snapshot.projectEvaluationDate,
    pptFileName: project?.pptFileName ?? null,
    hasPptAttachment: !!project?.pptStoragePath,
  };
}

function getWorkAssignment(
  project: TeamProjectInfo | undefined,
  profileId: string,
): string {
  return project?.evaluations[profileId]?.workAssignment?.trim() ?? "";
}

function buildMyTeamFromSnapshot(
  teamNumber: number,
  snapshot: SnapshotTeamAssignment,
  studentById: Map<string, ClassRoleStudent>,
  nameById: Map<string, string>,
  honorLabels: Record<string, string[]>,
): LearningStatusMyTeam | null {
  const leaderId = snapshot.teamLeaders[teamNumber];
  const memberIds = snapshot.teamMembers[teamNumber] ?? [];
  const projectData = snapshot.teamProjects[teamNumber];

  if (!leaderId && memberIds.length === 0) {
    return null;
  }

  const classPresidentId = snapshot.classPresidentId;

  const leader = leaderId
    ? toTeamMember(
        leaderId,
        teamNumber,
        studentById,
        nameById,
        honorLabels,
        classPresidentId,
        getWorkAssignment(projectData, leaderId),
        { asLeader: true },
      )
    : null;

  const members = memberIds
    .filter((memberId) => memberId !== leaderId)
    .map((memberId) =>
      toTeamMember(
        memberId,
        teamNumber,
        studentById,
        nameById,
        honorLabels,
        classPresidentId,
        getWorkAssignment(projectData, memberId),
      ),
    );

  return {
    teamNumber,
    leader,
    members,
    project: buildTeamProject(snapshot, teamNumber),
  };
}

async function fetchProfileNamesByIds(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", uniqueIds);

  if (error) {
    console.error("프로필 이름 조회 오류:", error);
    return new Map();
  }

  const nameById = new Map<string, string>();
  for (const row of data ?? []) {
    if (typeof row.id === "string" && typeof row.name === "string") {
      nameById.set(row.id, row.name.trim());
    }
  }
  return nameById;
}

function collectProfileIdsFromSnapshot(
  snapshot: SnapshotTeamAssignment,
  teamNumber: number,
): string[] {
  const ids = new Set<string>();
  const leaderId = snapshot.teamLeaders[teamNumber];
  if (leaderId) ids.add(leaderId);
  for (const memberId of snapshot.teamMembers[teamNumber] ?? []) {
    ids.add(memberId);
  }
  if (snapshot.classPresidentId) {
    ids.add(snapshot.classPresidentId);
  }
  return [...ids];
}

function buildMyTeamFromProfiles(
  teamNumber: number,
  rolesState: ReturnType<typeof buildClassRolesStateFromStudents>,
  studentById: Map<string, ClassRoleStudent>,
  honorLabels: Record<string, string[]>,
  snapshot: SnapshotTeamAssignment | null,
): LearningStatusMyTeam | null {
  const leaderId = rolesState.teamLeaders[teamNumber];
  const memberIds = rolesState.teamMembers[teamNumber] ?? [];
  const projectData = snapshot?.teamProjects[teamNumber];
  const nameById = new Map<string, string>();

  if (!leaderId && memberIds.length === 0) {
    return null;
  }

  const classPresidentId = rolesState.classPresidentId;

  const leader = leaderId
    ? toTeamMember(
        leaderId,
        teamNumber,
        studentById,
        nameById,
        honorLabels,
        classPresidentId,
        getWorkAssignment(projectData, leaderId),
        { asLeader: true },
      )
    : null;

  const members = memberIds
    .filter((memberId) => memberId !== leaderId)
    .map((memberId) =>
      toTeamMember(
        memberId,
        teamNumber,
        studentById,
        nameById,
        honorLabels,
        classPresidentId,
        getWorkAssignment(projectData, memberId),
      ),
    );

  return {
    teamNumber,
    leader,
    members,
    project: snapshot ? buildTeamProject(snapshot, teamNumber) : null,
  };
}

/**
 * 학습현황 — 내 팀 + (조 변경 시) 과거 팀 히스토리
 */
export async function fetchLearningStatusTeamComposition(
  supabase: SupabaseClient,
  userId: string,
  courseGroupName: string | null,
): Promise<LearningStatusTeamComposition> {
  const trimmedGroupName = courseGroupName?.trim() || null;
  const cohortLabel = trimmedGroupName
    ? extractCourseShortLabel(trimmedGroupName)
    : null;

  const emptyResult: LearningStatusTeamComposition = {
    courseGroupName: trimmedGroupName,
    cohortLabel,
    isTeamAssignmentActive: false,
    activeSnapshotTitle: null,
    currentUserId: userId,
    currentUserTeamNumber: null,
    myTeam: null,
    teamHistory: [],
  };

  if (!trimmedGroupName) {
    return emptyResult;
  }

  const [isTeamAssignmentActive, students, activeSnapshotResult, inactiveSnapshotsResult] =
    await Promise.all([
      isGroupTeamAssignmentActive(supabase, trimmedGroupName),
      fetchClassRoleStudents(supabase, trimmedGroupName),
      supabase
        .from("class_role_snapshots")
        .select(
          "id, title, updated_at, class_president_id, team_leaders, team_members, team_count, team_projects, project_evaluation_date",
        )
        .eq("group_name", trimmedGroupName)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("class_role_snapshots")
        .select(
          "id, title, updated_at, class_president_id, team_leaders, team_members, team_count, team_projects, project_evaluation_date",
        )
        .eq("group_name", trimmedGroupName)
        .eq("is_active", false)
        .order("updated_at", { ascending: false }),
    ]);

  const studentById = new Map(students.map((student) => [student.id, student]));
  const currentUser = studentById.get(userId);
  const currentUserTeamNumber = currentUser?.teamNumber ?? null;

  if (!isTeamAssignmentActive) {
    return {
      ...emptyResult,
      currentUserTeamNumber,
    };
  }

  const honorLabels = await fetchHonorBadgeLabelsByProfileId(
    supabase,
    students.map((student) => student.id),
  );

  const activeSnapshot = activeSnapshotResult.data
    ? parseSnapshotTeamAssignment(
        activeSnapshotResult.data as ClassRoleSnapshotRecord,
      )
    : null;

  const rolesState = buildClassRolesStateFromStudents(students);

  const resolvedTeamNumber =
    (activeSnapshot
      ? findUserTeamNumberInSnapshot(
          userId,
          activeSnapshot.teamLeaders,
          activeSnapshot.teamMembers,
          activeSnapshot.teamCount,
        )
      : null) ??
    currentUserTeamNumber ??
    findUserTeamNumberInSnapshot(
      userId,
      rolesState.teamLeaders,
      rolesState.teamMembers,
      rolesState.teamCount,
    );

  const myTeam =
    resolvedTeamNumber !== null
      ? activeSnapshot
        ? buildMyTeamFromSnapshot(
            resolvedTeamNumber,
            activeSnapshot,
            studentById,
            new Map(),
            honorLabels,
          )
        : buildMyTeamFromProfiles(
            resolvedTeamNumber,
            rolesState,
            studentById,
            honorLabels,
            null,
          )
      : null;

  const teamHistory: LearningStatusTeamHistoryEntry[] = [];
  const inactiveSnapshots = (inactiveSnapshotsResult.data ?? []).filter((row) =>
    recordHasTeamAssignments(
      row as Pick<
        ClassRoleSnapshotRecord,
        "team_leaders" | "team_members" | "team_count"
      >,
    ),
  );

  for (const row of inactiveSnapshots) {
    const snapshot = parseSnapshotTeamAssignment(row as ClassRoleSnapshotRecord);
    const historyTeamNumber = findUserTeamNumberInSnapshot(
      userId,
      snapshot.teamLeaders,
      snapshot.teamMembers,
      snapshot.teamCount,
    );

    if (historyTeamNumber === null) {
      continue;
    }

    const profileIds = collectProfileIdsFromSnapshot(
      snapshot,
      historyTeamNumber,
    );
    const nameById = await fetchProfileNamesByIds(supabase, profileIds);

    const historyTeam = buildMyTeamFromSnapshot(
      historyTeamNumber,
      snapshot,
      studentById,
      nameById,
      honorLabels,
    );

    if (!historyTeam) {
      continue;
    }

    teamHistory.push({
      snapshotId: snapshot.snapshotId,
      snapshotTitle: snapshot.snapshotTitle,
      archivedAt: snapshot.archivedAt,
      team: historyTeam,
    });
  }

  return {
    courseGroupName: trimmedGroupName,
    cohortLabel,
    isTeamAssignmentActive: true,
    activeSnapshotTitle: activeSnapshot?.snapshotTitle ?? null,
    currentUserId: userId,
    currentUserTeamNumber: resolvedTeamNumber,
    myTeam,
    teamHistory,
  };
}
