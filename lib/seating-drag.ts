/** 드래그 payload 타입 */
export type SeatingDragPayload =
  | { type: "student"; name: string }
  | { type: "desk"; seatKey: string; name: string };

const DRAG_MIME = "application/x-seating-drag";

/** 드래그 데이터 직렬화 */
export function serializeSeatingDrag(payload: SeatingDragPayload): string {
  return JSON.stringify(payload);
}

/** 드래그 데이터 파싱 (실패 시 null) */
export function parseSeatingDrag(raw: string): SeatingDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SeatingDragPayload;
    if (parsed.type === "student" && typeof parsed.name === "string") {
      return { type: "student", name: parsed.name };
    }
    if (
      parsed.type === "desk" &&
      typeof parsed.seatKey === "string" &&
      typeof parsed.name === "string"
    ) {
      return { type: "desk", seatKey: parsed.seatKey, name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}

export { DRAG_MIME };

/** 배정된 이름 집합 */
export function getAssignedNameSet(
  seatAssignments: Record<string, string>,
): Set<string> {
  const assigned = new Set<string>();
  for (const name of Object.values(seatAssignments)) {
    const trimmed = name.trim();
    if (trimmed) assigned.add(trimmed);
  }
  return assigned;
}

/** 명단에서 아직 배치되지 않은 학생 */
export function getUnassignedStudents(
  roster: string[],
  seatAssignments: Record<string, string>,
): string[] {
  const assigned = getAssignedNameSet(seatAssignments);
  return roster.filter((name) => !assigned.has(name));
}

/** 좌석에 학생 드롭 시 배정 갱신 */
export function applySeatDrop(
  seatAssignments: Record<string, string>,
  targetSeatKey: string,
  payload: SeatingDragPayload,
): Record<string, string> {
  const next = { ...seatAssignments };
  const targetCurrent = (next[targetSeatKey] ?? "").trim();

  if (payload.type === "student") {
    // 같은 이름이 다른 좌석에 있으면 제거
    for (const [key, value] of Object.entries(next)) {
      if (value.trim() === payload.name) {
        delete next[key];
      }
    }
    next[targetSeatKey] = payload.name;
    return next;
  }

  if (payload.type === "desk") {
    if (payload.seatKey === targetSeatKey) return seatAssignments;

    if (targetCurrent) {
      next[payload.seatKey] = targetCurrent;
    } else {
      delete next[payload.seatKey];
    }
    next[targetSeatKey] = payload.name;
    return next;
  }

  return seatAssignments;
}

/** 명단 영역에 드롭 시 좌석 비우기 */
export function applyRosterDrop(
  seatAssignments: Record<string, string>,
  payload: SeatingDragPayload,
): Record<string, string> {
  if (payload.type !== "desk") return seatAssignments;
  const next = { ...seatAssignments };
  delete next[payload.seatKey];
  return next;
}
