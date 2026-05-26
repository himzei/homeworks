import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { buildLadder } from "@/lib/ladder";
import { ladderRowToRecord, type LadderGameRow } from "@/lib/ladder-db";

/** 사다리 가로줄만 다시 섞기 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const { data: existing, error: fetchError } = await supabase
    .from("ladder_games")
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
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

  const { rungs, diagonalRungs } = buildLadder(row.participant_count);

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update({ rungs, diagonal_rungs: diagonalRungs })
    .eq("id", id)
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
    .single();

  if (updateError || !updated) {
    console.error("POST /api/ladder-games/[id]/reshuffle:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({
    game: ladderRowToRecord(updated as LadderGameRow),
  });
}
