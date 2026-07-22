import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  buildLadderRespectingExclusions,
  hasExclusionViolation,
  hasForcedLargestTeamViolation,
} from "@/lib/ladder";
import { resolveEffectiveLadderConstraints } from "@/lib/ladder-effective-constraints";
import {
  LADDER_GAME_SELECT,
  ladderRowToRecord,
  type LadderGameRow,
} from "@/lib/ladder-db";

/** 게임 시작(결과 고정) — 멱등. 기수 규칙 위반 시 사다리를 다시 맞춘 뒤 시작 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const { data: existing, error: fetchError } = await supabase
    .from("ladder_games")
    .select(LADDER_GAME_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("POST /api/ladder-games/[id]/play fetch:", fetchError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = existing as LadderGameRow;
  if (row.played_at) {
    const record = ladderRowToRecord(row);
    const { exclusionPairs, forcedLargestTeamNames } =
      await resolveEffectiveLadderConstraints(supabase, {
        groupName: record.groupName,
        participantNames: record.participantNames,
        gameLevelPairs: record.exclusionPairs,
      });
    return NextResponse.json({
      game: { ...record, exclusionPairs, forcedLargestTeamNames },
    });
  }

  const current = ladderRowToRecord(row);
  const { exclusionPairs, forcedLargestTeamNames } =
    await resolveEffectiveLadderConstraints(supabase, {
      groupName: current.groupName,
      participantNames: current.participantNames,
      gameLevelPairs: current.exclusionPairs,
    });

  const updatePayload: Record<string, unknown> = {
    played_at: new Date().toISOString(),
  };

  const needsRebuild =
    (exclusionPairs.length > 0 &&
      hasExclusionViolation(
        current.participantNames,
        current.resultItems,
        current.rungs,
        current.diagonalRungs ?? [],
        current.rowCount,
        exclusionPairs,
      )) ||
    (forcedLargestTeamNames.length > 0 &&
      hasForcedLargestTeamViolation(
        current.participantNames,
        current.resultItems,
        current.rungs,
        current.diagonalRungs ?? [],
        current.rowCount,
        forcedLargestTeamNames,
      ));

  // 시작 직전에 배정 조건이 깨져 있으면 사다리를 다시 생성
  if (needsRebuild) {
    const ladder = buildLadderRespectingExclusions(
      row.participant_count,
      current.participantNames,
      current.resultItems,
      exclusionPairs,
      forcedLargestTeamNames,
    );
    if (!ladder) {
      return NextResponse.json(
        { error: "exclusion_unsatisfiable" },
        { status: 400 },
      );
    }
    updatePayload.rungs = ladder.rungs;
    updatePayload.diagonal_rungs = ladder.diagonalRungs;
  }

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update(updatePayload)
    .eq("id", id)
    .select(LADDER_GAME_SELECT)
    .single();

  if (updateError || !updated) {
    console.error("POST /api/ladder-games/[id]/play:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({
    game: {
      ...ladderRowToRecord(updated as LadderGameRow),
      exclusionPairs,
      forcedLargestTeamNames,
    },
  });
}
