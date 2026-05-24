/** 명예 배지 드래그 payload */
export type HonorBadgesDragPayload =
  | { type: "student"; studentId: string }
  | { type: "badge-member"; studentId: string; badgeId: string };

export const HONOR_BADGES_DRAG_MIME = "application/x-honor-badges-drag";

export function serializeHonorBadgesDrag(
  payload: HonorBadgesDragPayload,
): string {
  return JSON.stringify(payload);
}

export function parseHonorBadgesDrag(
  raw: string,
): HonorBadgesDragPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as HonorBadgesDragPayload;
    if (parsed.type === "student" && typeof parsed.studentId === "string") {
      return { type: "student", studentId: parsed.studentId };
    }
    if (
      parsed.type === "badge-member" &&
      typeof parsed.studentId === "string" &&
      typeof parsed.badgeId === "string"
    ) {
      return {
        type: "badge-member",
        studentId: parsed.studentId,
        badgeId: parsed.badgeId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
