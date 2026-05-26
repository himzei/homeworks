import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { ladderRowToRecord, type LadderGameRow } from "@/lib/ladder-db";

/** 게임 시작(결과 고정) — 멱등 */
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
    console.error("POST /api/ladder-games/[id]/play fetch:", fetchError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = existing as LadderGameRow;
  if (row.played_at) {
    return NextResponse.json({ game: ladderRowToRecord(row) });
  }

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update({ played_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
    .single();

  if (updateError || !updated) {
    console.error("POST /api/ladder-games/[id]/play:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({
    game: ladderRowToRecord(updated as LadderGameRow),
  });
}
