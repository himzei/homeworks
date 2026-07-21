/**
 * 사다리게임 — 기수(과정) 공통 같은 결과 금지 규칙
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeExclusionPairs,
  type LadderExclusionPair,
} from "@/lib/ladder";

export type LadderGroupExclusionRuleRow = {
  id: string;
  group_name: string;
  name_a: string;
  name_b: string;
  created_at: string;
};

export type LadderGroupExclusionRule = {
  id: string;
  groupName: string;
  nameA: string;
  nameB: string;
  createdAt: number;
};

function toEpochMs(value: string | null | undefined): number {
  if (!value) return Date.now();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Date.now();
}

export function ruleRowToRecord(
  row: LadderGroupExclusionRuleRow,
): LadderGroupExclusionRule {
  return {
    id: row.id,
    groupName: row.group_name,
    nameA: row.name_a,
    nameB: row.name_b,
    createdAt: toEpochMs(row.created_at),
  };
}

/** 특정 기수의 금지 쌍 목록 */
export async function fetchGroupExclusionPairs(
  supabase: SupabaseClient,
  groupName: string,
): Promise<LadderExclusionPair[]> {
  const trimmed = groupName.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from("ladder_group_exclusion_rules")
    .select("name_a, name_b")
    .eq("group_name", trimmed);

  if (error) {
    console.error("기수 금지 규칙 조회 오류:", error);
    return [];
  }

  return normalizeExclusionPairs(
    (data ?? []).map((row) => ({
      nameA: row.name_a,
      nameB: row.name_b,
    })),
  );
}

/**
 * 사다리에 실제로 적용할 금지 쌍.
 * - 기수 규칙 중 참가자에 둘 다 있는 쌍만
 * - (호환) 게임별 exclusion_pairs 도 병합
 */
export async function resolveEffectiveExclusionPairs(
  supabase: SupabaseClient,
  options: {
    groupName?: string | null;
    participantNames: string[];
    gameLevelPairs?: LadderExclusionPair[];
  },
): Promise<LadderExclusionPair[]> {
  const participantSet = new Set(
    options.participantNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );

  const groupPairs = options.groupName?.trim()
    ? await fetchGroupExclusionPairs(supabase, options.groupName)
    : [];

  const merged = normalizeExclusionPairs([
    ...groupPairs,
    ...(options.gameLevelPairs ?? []),
  ]);

  return merged.filter(
    (pair) =>
      participantSet.has(pair.nameA) && participantSet.has(pair.nameB),
  );
}
