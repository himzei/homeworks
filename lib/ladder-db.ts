/**
 * 사다리게임 DB 행 ↔ 도메인 레코드 변환 (API 라우트용)
 */

import type {
  DiagonalRung,
  LadderGameRecord,
  LadderRung,
} from "@/lib/ladder";

export type LadderGameRow = {
  id: string;
  title: string;
  participant_count: number;
  participant_names: unknown;
  result_items: unknown;
  rungs: unknown;
  diagonal_rungs: unknown;
  row_count: number;
  author_user_id: string | null;
  author_name: string;
  created_at: string;
  played_at: string | null;
};

export function toEpochMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseRungs(value: unknown): LadderRung[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LadderRung =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as LadderRung).row === "number" &&
      typeof (item as LadderRung).leftCol === "number",
  );
}

function parseDiagonalRungs(value: unknown): DiagonalRung[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is DiagonalRung =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as DiagonalRung).row === "number" &&
      typeof (item as DiagonalRung).fromCol === "number" &&
      typeof (item as DiagonalRung).toCol === "number",
  );
}

export function ladderRowToRecord(row: LadderGameRow): LadderGameRecord {
  return {
    id: row.id,
    title: row.title,
    participantCount: row.participant_count,
    participantNames: parseStringArray(row.participant_names),
    resultItems: parseStringArray(row.result_items),
    rungs: parseRungs(row.rungs),
    diagonalRungs: parseDiagonalRungs(row.diagonal_rungs),
    rowCount: row.row_count,
    authorUserId: row.author_user_id ?? undefined,
    authorName: row.author_name,
    createdAt: toEpochMs(row.created_at) ?? Date.now(),
    playedAt: toEpochMs(row.played_at),
  };
}
