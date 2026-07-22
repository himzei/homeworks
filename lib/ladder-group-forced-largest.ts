/**
 * 사다리게임 — 기수(과정) 공통 "가장 큰 조(5인 조) 고정" 규칙
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeForcedLargestTeamNames } from "@/lib/ladder";

export type LadderGroupForcedLargestRuleRow = {
  id: string;
  group_name: string;
  student_name: string;
  created_at: string;
};

export type LadderGroupForcedLargestRule = {
  id: string;
  groupName: string;
  studentName: string;
  createdAt: number;
};

function toEpochMs(value: string | null | undefined): number {
  if (!value) return Date.now();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Date.now();
}

export function forcedLargestRuleRowToRecord(
  row: LadderGroupForcedLargestRuleRow,
): LadderGroupForcedLargestRule {
  return {
    id: row.id,
    groupName: row.group_name,
    studentName: row.student_name,
    createdAt: toEpochMs(row.created_at),
  };
}

/** 특정 기수의 5인 조 고정 학생 이름 목록 */
export async function fetchGroupForcedLargestTeamNames(
  supabase: SupabaseClient,
  groupName: string,
): Promise<string[]> {
  const trimmed = groupName.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("ladder_group_forced_largest_team_rules")
    .select("student_name")
    .eq("group_name", trimmed);

  if (error) {
    console.error("기수 5인 조 고정 규칙 조회 오류:", error);
    return [];
  }

  return normalizeForcedLargestTeamNames(
    (data ?? []).map((row) => row.student_name),
  );
}

/**
 * 사다리에 실제로 적용할 5인 조 고정 이름.
 * - 기수 규칙 중 참가자에 있는 이름만
 */
export async function resolveEffectiveForcedLargestTeamNames(
  supabase: SupabaseClient,
  options: {
    groupName?: string | null;
    participantNames: string[];
  },
): Promise<string[]> {
  const participantSet = new Set(
    options.participantNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );

  const groupNames = options.groupName?.trim()
    ? await fetchGroupForcedLargestTeamNames(supabase, options.groupName)
    : [];

  return normalizeForcedLargestTeamNames(groupNames).filter((name) =>
    participantSet.has(name),
  );
}
