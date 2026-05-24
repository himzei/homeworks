/** 조 편성 드래그 payload */
export type TeamRolesDragPayload =
  | { type: "student"; studentId: string }
  | { type: "class-president"; studentId: string }
  | { type: "team-member"; studentId: string; teamNumber: number }
  | { type: "team-leader"; studentId: string; teamNumber: number };

export const TEAM_ROLES_DRAG_MIME = "application/x-team-roles-drag";

export function serializeTeamRolesDrag(payload: TeamRolesDragPayload): string {
  return JSON.stringify(payload);
}

export function parseTeamRolesDrag(raw: string): TeamRolesDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TeamRolesDragPayload;
    if (parsed.type === "student" && typeof parsed.studentId === "string") {
      return { type: "student", studentId: parsed.studentId };
    }
    if (
      parsed.type === "class-president" &&
      typeof parsed.studentId === "string"
    ) {
      return { type: "class-president", studentId: parsed.studentId };
    }
    if (
      parsed.type === "team-member" &&
      typeof parsed.studentId === "string" &&
      typeof parsed.teamNumber === "number"
    ) {
      return {
        type: "team-member",
        studentId: parsed.studentId,
        teamNumber: parsed.teamNumber,
      };
    }
    if (
      parsed.type === "team-leader" &&
      typeof parsed.studentId === "string" &&
      typeof parsed.teamNumber === "number"
    ) {
      return {
        type: "team-leader",
        studentId: parsed.studentId,
        teamNumber: parsed.teamNumber,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 어떤 조에도 속하지 않은 학생 id */
export function getUnassignedStudentIds(
  studentIds: string[],
  teamLeaders: Record<number, string>,
  teamMembers: Record<number, string[]>,
  excludeIds: Set<string> = new Set(),
): string[] {
  const assigned = new Set<string>(excludeIds);
  for (const leaderId of Object.values(teamLeaders)) {
    if (leaderId) assigned.add(leaderId);
  }
  for (const members of Object.values(teamMembers)) {
    for (const id of members) assigned.add(id);
  }
  return studentIds.filter((id) => !assigned.has(id));
}
