import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGACY_GROUPS } from "@/lib/constants";

/** 반장·조장 역할 코드 */
export const CLASS_OFFICER_ROLE = {
  CLASS_PRESIDENT: "class_president",
  TEAM_LEADER: "team_leader",
} as const;

export type ClassOfficerRole =
  (typeof CLASS_OFFICER_ROLE)[keyof typeof CLASS_OFFICER_ROLE];

/** 과정 내 학생 (반·조 지정용) */
export type ClassRoleStudent = {
  id: string;
  name: string;
  classOfficerRole: ClassOfficerRole | null;
  teamNumber: number | null;
};

/** 과정별 반·조 현황 */
export type ClassRolesState = {
  classPresidentId: string | null;
  /** key: 조 번호(1-based) */
  teamLeaders: Record<number, string>;
  /** key: 조 번호 → 조원 id 목록 (조장 제외) */
  teamMembers: Record<number, string[]>;
  /** 표시할 조 개수 */
  teamCount: number;
};

/** 반장·조장·조원 (조 편성 게시판·드래그 보드용) */
export type TeamRolesState = {
  classPresidentId: string | null;
  teamLeaders: Record<number, string>;
  teamMembers: Record<number, string[]>;
  teamCount: number;
};

export const DEFAULT_TEAM_COUNT = 6;
export const MAX_TEAM_COUNT = 20;

/** 역할 한글 라벨 */
/** 이름 → 반·조 정보 (자리배치도 등) */
export type StudentOfficerInfo = {
  classOfficerRole: ClassOfficerRole | null;
  teamNumber: number | null;
  /** 반장이 조장 칸에 배치된 경우 */
  isTeamLeader?: boolean;
  /** 명예 배지 (5월우수 등) */
  honorBadgeLabels?: string[];
};

/** DB JSON → 이름 기준 반·조 맵 (자리배치도 스냅샷) */
export function parseOfficerByStudentNameFromJson(
  raw: unknown,
): Record<string, StudentOfficerInfo> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const map: Record<string, StudentOfficerInfo> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = name.trim();
    if (!key || !value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }
    const entry = value as {
      classOfficerRole?: unknown;
      teamNumber?: unknown;
      isTeamLeader?: unknown;
      honorBadgeLabels?: unknown;
    };
    const rawRole = entry.classOfficerRole;
    const classOfficerRole =
      rawRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT ||
      rawRole === CLASS_OFFICER_ROLE.TEAM_LEADER
        ? rawRole
        : null;
    const teamNumber =
      typeof entry.teamNumber === "number" ? entry.teamNumber : null;
    const honorBadgeLabels = Array.isArray(entry.honorBadgeLabels)
      ? entry.honorBadgeLabels
          .filter((label): label is string => typeof label === "string")
          .map((label) => label.trim())
          .filter(Boolean)
      : [];
    if (!classOfficerRole && !teamNumber && honorBadgeLabels.length === 0) {
      continue;
    }

    map[key] = {
      classOfficerRole,
      teamNumber,
      ...(entry.isTeamLeader === true ? { isTeamLeader: true } : {}),
      ...(honorBadgeLabels.length > 0 ? { honorBadgeLabels } : {}),
    };
  }
  return map;
}

/** 조별 조장 id (team_number → user id) */
function buildTeamLeaderIdByTeam(
  students: ClassRoleStudent[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const student of students) {
    if (
      student.classOfficerRole === CLASS_OFFICER_ROLE.TEAM_LEADER &&
      student.teamNumber
    ) {
      map.set(student.teamNumber, student.id);
    }
  }
  return map;
}

/** 반장이 조장 칸에만 있는지 (해당 조에 별도 조장이 없음) */
function isPresidentAsTeamLeader(
  student: ClassRoleStudent,
  teamLeaderIdByTeam: Map<number, string>,
): boolean {
  if (student.classOfficerRole !== CLASS_OFFICER_ROLE.CLASS_PRESIDENT) {
    return false;
  }
  if (!student.teamNumber) return false;
  return !teamLeaderIdByTeam.has(student.teamNumber);
}

/** 학생 목록 → 이름(trim) 기준 반·조 맵 */
export function buildOfficerInfoByStudentName(
  students: ClassRoleStudent[],
): Record<string, StudentOfficerInfo> {
  const teamLeaderIdByTeam = buildTeamLeaderIdByTeam(students);
  const map: Record<string, StudentOfficerInfo> = {};

  for (const student of students) {
    const key = student.name.trim();
    if (!key) continue;
    if (!student.classOfficerRole && !student.teamNumber) continue;

    const isTeamLeader = isPresidentAsTeamLeader(student, teamLeaderIdByTeam);

    map[key] = {
      classOfficerRole: student.classOfficerRole,
      teamNumber: student.teamNumber,
      ...(isTeamLeader ? { isTeamLeader: true } : {}),
    };
  }
  return map;
}

/** 명예 배지를 이름 기준 반·조 맵에 병합 */
export function mergeHonorBadgesIntoOfficerByStudentName(
  officerByStudentName: Record<string, StudentOfficerInfo>,
  students: ClassRoleStudent[],
  honorLabelsByProfileId: Record<string, string[]>,
): Record<string, StudentOfficerInfo> {
  const result = { ...officerByStudentName };

  for (const student of students) {
    const key = student.name.trim();
    const labels = honorLabelsByProfileId[student.id];
    if (!key || !labels?.length) continue;

    const existing = result[key];
    if (existing) {
      result[key] = { ...existing, honorBadgeLabels: labels };
    } else {
      result[key] = {
        classOfficerRole: null,
        teamNumber: null,
        honorBadgeLabels: labels,
      };
    }
  }

  return result;
}

export function getClassOfficerLabel(
  role: string | null | undefined,
  teamNumber: number | null | undefined,
): string | null {
  if (role === CLASS_OFFICER_ROLE.CLASS_PRESIDENT) {
    return "반장";
  }
  if (role === CLASS_OFFICER_ROLE.TEAM_LEADER && teamNumber) {
    return `${teamNumber}조 조장`;
  }
  if (teamNumber) {
    return `${teamNumber}조`;
  }
  return null;
}

/** 학생 목록 → 반·조 상태 */
export function buildClassRolesStateFromStudents(
  students: ClassRoleStudent[],
  teamCount = DEFAULT_TEAM_COUNT,
): ClassRolesState {
  let classPresidentId: string | null = null;
  const teamLeaders: Record<number, string> = {};
  const teamMembers: Record<number, string[]> = {};
  let maxTeam = teamCount;

  for (const student of students) {
    if (student.classOfficerRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT) {
      classPresidentId = student.id;
      // 반장도 조에 속할 수 있음 (역할은 반장 유지, team_number만 반영)
      if (student.teamNumber) {
        const members = teamMembers[student.teamNumber] ?? [];
        members.push(student.id);
        teamMembers[student.teamNumber] = members;
        maxTeam = Math.max(maxTeam, student.teamNumber);
      }
      continue;
    }
    if (
      student.classOfficerRole === CLASS_OFFICER_ROLE.TEAM_LEADER &&
      student.teamNumber
    ) {
      teamLeaders[student.teamNumber] = student.id;
      maxTeam = Math.max(maxTeam, student.teamNumber);
      continue;
    }
    if (student.teamNumber && !student.classOfficerRole) {
      const members = teamMembers[student.teamNumber] ?? [];
      members.push(student.id);
      teamMembers[student.teamNumber] = members;
      maxTeam = Math.max(maxTeam, student.teamNumber);
    }
  }

  return {
    classPresidentId,
    teamLeaders,
    teamMembers,
    teamCount: Math.min(MAX_TEAM_COUNT, Math.max(DEFAULT_TEAM_COUNT, maxTeam)),
  };
}

/** 학생 목록 → 조장·조원 상태 (반장 제외) */
export function buildTeamRolesStateFromStudents(
  students: ClassRoleStudent[],
  teamCount = DEFAULT_TEAM_COUNT,
): TeamRolesState {
  const full = buildClassRolesStateFromStudents(students, teamCount);
  return {
    classPresidentId: full.classPresidentId,
    teamLeaders: full.teamLeaders,
    teamMembers: full.teamMembers,
    teamCount: full.teamCount,
  };
}

/** 조 편성 글쓰기 초기값 — 조 배정 없이 빈 보드로 시작 */
export function buildEmptyTeamRolesState(
  students: ClassRoleStudent[],
  teamCount = DEFAULT_TEAM_COUNT,
): TeamRolesState {
  return {
    classPresidentId: findClassPresidentId(students),
    teamLeaders: {},
    teamMembers: {},
    teamCount,
  };
}

/** profiles에서 현재 반장 id */
export function findClassPresidentId(
  students: ClassRoleStudent[],
): string | null {
  return (
    students.find(
      (s) => s.classOfficerRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT,
    )?.id ?? null
  );
}

/**
 * 특정 과정 학생 목록 (반·조 관리용)
 */
export async function fetchClassRoleStudents(
  supabase: SupabaseClient,
  groupName: string,
): Promise<ClassRoleStudent[]> {
  let query = supabase
    .from("profiles")
    .select("id, name, role, class_officer_role, team_number")
    .neq("role", "admin")
    .order("name", { ascending: true });

  if (LEGACY_GROUPS.includes(groupName as (typeof LEGACY_GROUPS)[number])) {
    const escaped = groupName.replace(/"/g, '""');
    query = query.or(`group_name.eq."${escaped}",group_name.is.null`);
  } else {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("반·조 관리 학생 조회 오류:", error);
    return [];
  }

  return (data ?? []).flatMap((profile) =>
    parseClassRoleStudentRow(profile as ProfileOfficerRow),
  );
}

type ProfileOfficerRow = {
  id?: string;
  name: string | null;
  class_officer_role: string | null;
  team_number: number | null;
};

function parseClassRoleStudentRow(
  profile: ProfileOfficerRow,
): ClassRoleStudent[] {
  const name = (profile.name ?? "").trim();
  if (!name) return [];

  const rawRole = profile.class_officer_role;
  const classOfficerRole =
    rawRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT ||
    rawRole === CLASS_OFFICER_ROLE.TEAM_LEADER
      ? rawRole
      : null;

  return [
    {
      id: profile.id ?? "",
      name,
      classOfficerRole,
      teamNumber:
        typeof profile.team_number === "number" ? profile.team_number : null,
    },
  ];
}

/** 이름 목록으로 반·조 맵 조회 (기수 미지정 자리배치도용) */
export async function fetchOfficersByStudentNames(
  supabase: SupabaseClient,
  names: string[],
): Promise<Record<string, StudentOfficerInfo>> {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("name, class_officer_role, team_number")
    .neq("role", "admin")
    .in("name", uniqueNames);

  if (error) {
    console.error("이름별 반·조 조회 오류:", error);
    return {};
  }

  const students = (data ?? []).flatMap((profile) =>
    parseClassRoleStudentRow(profile as ProfileOfficerRow),
  );
  return buildOfficerInfoByStudentName(students);
}
