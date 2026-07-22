/**
 * 사다리 배정에 쓸 기수 공통 제약(금지 쌍 + 5인 조 고정)을 한 번에 해석
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { LadderExclusionPair, LadderGameRecord } from "@/lib/ladder";
import { resolveEffectiveExclusionPairs } from "@/lib/ladder-group-exclusions";
import { resolveEffectiveForcedLargestTeamNames } from "@/lib/ladder-group-forced-largest";

export type LadderEffectiveConstraints = {
  exclusionPairs: LadderExclusionPair[];
  forcedLargestTeamNames: string[];
};

export async function resolveEffectiveLadderConstraints(
  supabase: SupabaseClient,
  options: {
    groupName?: string | null;
    participantNames: string[];
    gameLevelPairs?: LadderExclusionPair[];
  },
): Promise<LadderEffectiveConstraints> {
  const [exclusionPairs, forcedLargestTeamNames] = await Promise.all([
    resolveEffectiveExclusionPairs(supabase, options),
    resolveEffectiveForcedLargestTeamNames(supabase, {
      groupName: options.groupName,
      participantNames: options.participantNames,
    }),
  ]);

  return { exclusionPairs, forcedLargestTeamNames };
}

/** 게임 레코드에 실효 제약 필드를 붙임 */
export async function withEffectiveLadderConstraints(
  supabase: SupabaseClient,
  record: LadderGameRecord,
): Promise<LadderGameRecord> {
  const { exclusionPairs, forcedLargestTeamNames } =
    await resolveEffectiveLadderConstraints(supabase, {
      groupName: record.groupName,
      participantNames: record.participantNames,
      gameLevelPairs: record.exclusionPairs,
    });

  return {
    ...record,
    exclusionPairs,
    forcedLargestTeamNames,
  };
}
