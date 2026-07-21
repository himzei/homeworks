import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { buildLadderRespectingExclusions } from "@/lib/ladder";
import { resolveEffectiveExclusionPairs } from "@/lib/ladder-group-exclusions";
import {
  LADDER_GAME_SELECT,
  ladderRowToRecord,
  type LadderGameRow,
} from "@/lib/ladder-db";

/** 사다리 가로줄만 다시 섞기 (기수 공통 금지 규칙 반영) */
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
    console.error("POST /api/ladder-games/[id]/reshuffle fetch:", fetchError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = existing as LadderGameRow;
  if (row.played_at) {
    return NextResponse.json({ error: "already_played" }, { status: 400 });
  }

  const current = ladderRowToRecord(row);
  const exclusionPairs = await resolveEffectiveExclusionPairs(supabase, {
    groupName: current.groupName,
    participantNames: current.participantNames,
    gameLevelPairs: current.exclusionPairs,
  });

  const ladder = buildLadderRespectingExclusions(
    row.participant_count,
    current.participantNames,
    current.resultItems,
    exclusionPairs,
  );

  if (!ladder) {
    return NextResponse.json(
      { error: "exclusion_unsatisfiable" },
      { status: 400 },
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update({ rungs: ladder.rungs, diagonal_rungs: ladder.diagonalRungs })
    .eq("id", id)
    .select(LADDER_GAME_SELECT)
    .single();

  if (updateError || !updated) {
    console.error("POST /api/ladder-games/[id]/reshuffle:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const record = ladderRowToRecord(updated as LadderGameRow);
  return NextResponse.json({
    game: { ...record, exclusionPairs },
  });
}
