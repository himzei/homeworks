import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLASS_OFFICER_ROLE,
  DEFAULT_TEAM_COUNT,
  MAX_TEAM_COUNT,
} from "@/lib/class-officers";

export type ApplyClassRolesInput = {
  groupName: string;
  classPresidentId: string | null;
  teamLeaders: Map<number, string>;
  teamMembers: Map<number, string[]>;
  teamCount: number;
};

export type ApplyTeamRolesInput = {
  groupName: string;
  teamLeaders: Map<number, string>;
  teamMembers: Map<number, string[]>;
  teamCount: number;
};

export type ApplyClassRolesResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** teamLeaders JSON → Map */
export function parseTeamLeadersFromJson(
  raw: Record<string, string | null> | null | undefined,
  teamCount: number,
): Map<number, string> {
  const result = new Map<number, string>();
  if (!raw) return result;

  for (const [key, userId] of Object.entries(raw)) {
    const teamNumber = Number.parseInt(key, 10);
    if (
      !Number.isInteger(teamNumber) ||
      teamNumber < 1 ||
      teamNumber > teamCount
    ) {
      continue;
    }
    if (typeof userId === "string" && userId.trim()) {
      result.set(teamNumber, userId.trim());
    }
  }
  return result;
}

/** teamMembers JSON → Map */
export function parseTeamMembersFromJson(
  raw: Record<string, string[] | null> | null | undefined,
  teamCount: number,
): Map<number, string[]> {
  const result = new Map<number, string[]>();
  if (!raw) return result;

  for (const [key, memberIds] of Object.entries(raw)) {
    const teamNumber = Number.parseInt(key, 10);
    if (
      !Number.isInteger(teamNumber) ||
      teamNumber < 1 ||
      teamNumber > teamCount ||
      !Array.isArray(memberIds)
    ) {
      continue;
    }
    const ids = memberIds
      .filter((id): id is string => typeof id === "string" && !!id.trim())
      .map((id) => id.trim());
    if (ids.length > 0) {
      result.set(teamNumber, ids);
    }
  }
  return result;
}

/** API body에서 반장 id 파싱 */
export function parseClassPresidentId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** API body에서 teamCount 파싱 */
export function parseTeamCount(raw: unknown): number {
  return Math.min(
    MAX_TEAM_COUNT,
    Math.max(
      DEFAULT_TEAM_COUNT,
      typeof raw === "number" && Number.isInteger(raw) ? raw : DEFAULT_TEAM_COUNT,
    ),
  );
}

/** API body에서 teamLeaders 파싱 */
export function parseTeamLeadersFromBody(
  raw: Record<string, string | null> | undefined,
  teamCount: number,
): Map<number, string> {
  return parseTeamLeadersFromJson(raw, teamCount);
}

/** API body에서 teamMembers 파싱 */
export function parseTeamMembersFromBody(
  raw: Record<string, string[] | null> | undefined,
  teamCount: number,
): Map<number, string[]> {
  return parseTeamMembersFromJson(raw, teamCount);
}

/** Record body → Map (조원) */
export function parseTeamMembersFromBodyRecord(
  raw: Record<string, string[] | null> | undefined,
  teamCount: number,
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (!raw) return map;

  for (let team = 1; team <= teamCount; team++) {
    const key = String(team);
    const ids = raw[key];
    if (!Array.isArray(ids)) continue;
    const filtered = ids.filter((id) => typeof id === "string" && id.trim());
    if (filtered.length > 0) {
      map.set(team, filtered.map((id) => id.trim()));
    }
  }
  return map;
}

async function fetchGroupStudentIds(
  db: SupabaseClient,
  groupName: string,
): Promise<{ studentIds: string[]; error?: string }> {
  const { data: groupStudents, error: studentsError } = await db
    .from("profiles")
    .select("id")
    .eq("group_name", groupName)
    .neq("role", "admin")
    .eq("is_dormant", false);

  if (studentsError) {
    console.error("반·조 적용 학생 조회:", studentsError);
    return {
      studentIds: [],
      error: studentsError.message ?? "학생 목록 조회에 실패했습니다.",
    };
  }

  const studentIds = (groupStudents ?? []).map((row) => row.id);
  if (studentIds.length === 0) {
    return { studentIds: [], error: "해당 과정에 등록된 학생이 없습니다." };
  }

  return { studentIds };
}

/** profiles에서 현재 반장 id 조회 */
export async function fetchClassPresidentIdForGroup(
  db: SupabaseClient,
  groupName: string,
): Promise<string | null> {
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("group_name", groupName)
    .eq("class_officer_role", CLASS_OFFICER_ROLE.CLASS_PRESIDENT)
    .neq("role", "admin")
    .maybeSingle();

  return data?.id ?? null;
}

function validateTeamAssignments(
  classPresidentId: string | null,
  teamLeaders: Map<number, string>,
  teamMembers: Map<number, string[]>,
  studentIds: string[],
): ApplyClassRolesResult | null {
  const assignIds = new Set<string>();
  if (classPresidentId) assignIds.add(classPresidentId);

  for (const leaderId of teamLeaders.values()) {
    assignIds.add(leaderId);
  }

  const memberToTeam = new Map<string, number>();
  for (const [teamNumber, memberIds] of teamMembers) {
    const leaderId = teamLeaders.get(teamNumber);
    for (const memberId of memberIds) {
      if (leaderId && memberId === leaderId) {
        continue;
      }
      if (memberToTeam.has(memberId)) {
        return {
          ok: false,
          error: "한 학생은 하나의 조에만 배정할 수 있습니다.",
          status: 400,
        };
      }
      memberToTeam.set(memberId, teamNumber);
      assignIds.add(memberId);
    }
  }

  for (const id of assignIds) {
    if (!studentIds.includes(id)) {
      return {
        ok: false,
        error: "선택한 학생이 해당 과정에 속하지 않습니다.",
        status: 400,
      };
    }
  }

  return null;
}

/**
 * 반장만 profiles에 반영 (목록 페이지용)
 */
export async function applyClassPresidentToProfiles(
  db: SupabaseClient,
  groupName: string,
  classPresidentId: string | null,
): Promise<ApplyClassRolesResult> {
  const { studentIds, error } = await fetchGroupStudentIds(db, groupName);
  if (error) {
    return { ok: false, error, status: 400 };
  }

  if (classPresidentId && !studentIds.includes(classPresidentId)) {
    return {
      ok: false,
      error: "선택한 학생이 해당 과정에 속하지 않습니다.",
      status: 400,
    };
  }

  const { error: clearPresidentError } = await db
    .from("profiles")
    .update({ class_officer_role: null })
    .eq("group_name", groupName)
    .eq("class_officer_role", CLASS_OFFICER_ROLE.CLASS_PRESIDENT)
    .neq("role", "admin");

  if (clearPresidentError) {
    console.error("반장 초기화:", clearPresidentError);
    return {
      ok: false,
      error: clearPresidentError.message ?? "저장에 실패했습니다.",
      status: 400,
    };
  }

  if (!classPresidentId) {
    return { ok: true };
  }

  const { error: presidentSaveError } = await db
    .from("profiles")
    .update({
      class_officer_role: CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
      team_number: null,
    })
    .eq("id", classPresidentId)
    .eq("group_name", groupName);

  if (presidentSaveError) {
    console.error("반장 저장:", presidentSaveError);
    return {
      ok: false,
      error: presidentSaveError.message ?? "반장 저장에 실패했습니다.",
      status: 400,
    };
  }

  return { ok: true };
}

/**
 * 조장·조원만 profiles에 반영 (반장 유지)
 */
export async function applyTeamRolesToProfiles(
  db: SupabaseClient,
  input: ApplyTeamRolesInput,
): Promise<ApplyClassRolesResult> {
  const classPresidentId = await fetchClassPresidentIdForGroup(
    db,
    input.groupName,
  );

  return applyClassRolesToProfiles(db, {
    groupName: input.groupName,
    classPresidentId,
    teamLeaders: input.teamLeaders,
    teamMembers: input.teamMembers,
    teamCount: input.teamCount,
  });
}

/**
 * 반장·조장·조원 전체 profiles 반영
 */
export async function applyClassRolesToProfiles(
  db: SupabaseClient,
  input: ApplyClassRolesInput,
): Promise<ApplyClassRolesResult> {
  const { groupName, classPresidentId, teamLeaders, teamMembers, teamCount } =
    input;

  const { studentIds, error: fetchError } = await fetchGroupStudentIds(
    db,
    groupName,
  );
  if (fetchError) {
    return { ok: false, error: fetchError, status: 400 };
  }

  const validationError = validateTeamAssignments(
    classPresidentId,
    teamLeaders,
    teamMembers,
    studentIds,
  );
  if (validationError) return validationError;

  const { error: clearError } = await db
    .from("profiles")
    .update({ class_officer_role: null, team_number: null })
    .eq("group_name", groupName)
    .neq("role", "admin");

  if (clearError) {
    console.error("반·조 초기화:", clearError);
    return {
      ok: false,
      error: clearError.message ?? "저장에 실패했습니다.",
      status: 400,
    };
  }

  let presidentTeamNumber: number | null = null;

  for (const [teamNumber, userId] of teamLeaders) {
    if (classPresidentId && userId === classPresidentId) {
      presidentTeamNumber = teamNumber;
      const { error } = await db
        .from("profiles")
        .update({
          class_officer_role: CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
          team_number: teamNumber,
        })
        .eq("id", classPresidentId)
        .eq("group_name", groupName);

      if (error) {
        console.error("반장(조 배치) 저장:", error);
        return {
          ok: false,
          error: error.message ?? "반장 저장에 실패했습니다.",
          status: 400,
        };
      }
      continue;
    }

    const { error } = await db
      .from("profiles")
      .update({
        class_officer_role: CLASS_OFFICER_ROLE.TEAM_LEADER,
        team_number: teamNumber,
      })
      .eq("id", userId)
      .eq("group_name", groupName);

    if (error) {
      console.error("조장 저장:", error);
      return {
        ok: false,
        error:
          error.message ?? `${teamNumber}조 조장 저장에 실패했습니다.`,
        status: 400,
      };
    }
  }

  for (const [teamNumber, memberIds] of teamMembers) {
    const leaderId = teamLeaders.get(teamNumber);
    for (const memberId of memberIds) {
      if (memberId === leaderId) continue;

      if (classPresidentId && memberId === classPresidentId) {
        presidentTeamNumber = teamNumber;
        const { error } = await db
          .from("profiles")
          .update({
            class_officer_role: CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
            team_number: teamNumber,
          })
          .eq("id", classPresidentId)
          .eq("group_name", groupName);

        if (error) {
          console.error("반장(조원) 저장:", error);
          return {
            ok: false,
            error: error.message ?? "반장 저장에 실패했습니다.",
            status: 400,
          };
        }
        continue;
      }

      const { error } = await db
        .from("profiles")
        .update({
          class_officer_role: null,
          team_number: teamNumber,
        })
        .eq("id", memberId)
        .eq("group_name", groupName);

      if (error) {
        console.error("조원 저장:", error);
        return {
          ok: false,
          error:
            error.message ?? `${teamNumber}조 조원 저장에 실패했습니다.`,
          status: 400,
        };
      }
    }
  }

  if (classPresidentId && presidentTeamNumber === null) {
    const { error } = await db
      .from("profiles")
      .update({
        class_officer_role: CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
        team_number: null,
      })
      .eq("id", classPresidentId)
      .eq("group_name", groupName);

    if (error) {
      console.error("반장 저장:", error);
      return {
        ok: false,
        error: error.message ?? "반장 저장에 실패했습니다.",
        status: 400,
      };
    }
  }

  return { ok: true };
}

/** Map → DB JSONB (조장) */
export function teamLeadersMapToJson(
  teamLeaders: Map<number, string>,
): Record<string, string> {
  const json: Record<string, string> = {};
  for (const [teamNumber, userId] of teamLeaders) {
    json[String(teamNumber)] = userId;
  }
  return json;
}

/** Map → DB JSONB (조원) */
export function teamMembersMapToJson(
  teamMembers: Map<number, string[]>,
): Record<string, string[]> {
  const json: Record<string, string[]> = {};
  for (const [teamNumber, memberIds] of teamMembers) {
    if (memberIds.length > 0) {
      json[String(teamNumber)] = memberIds;
    }
  }
  return json;
}

/** Record → Map (조원, API body) */
export function teamMembersRecordToMap(
  raw: Record<string, string[] | null> | undefined,
  teamCount: number,
): Map<number, string[]> {
  return parseTeamMembersFromBodyRecord(raw, teamCount);
}
