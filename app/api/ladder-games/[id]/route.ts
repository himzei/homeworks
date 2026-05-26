import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import type { UpdateLadderGameInput } from "@/lib/ladder";
import { ladderRowToRecord, type LadderGameRow } from "@/lib/ladder-db";

function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

function parsePatchBody(body: unknown): UpdateLadderGameInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const patch: UpdateLadderGameInput = {};

  if (typeof raw.title === "string") {
    patch.title = raw.title;
  }
  if (Array.isArray(raw.participantNames)) {
    patch.participantNames = raw.participantNames.filter(
      (v): v is string => typeof v === "string",
    );
  }
  if (Array.isArray(raw.resultItems)) {
    patch.resultItems = raw.resultItems.filter(
      (v): v is string => typeof v === "string",
    );
  }

  return patch;
}

/** 단건 조회 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const { data, error } = await supabase
    .from("ladder_games")
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/ladder-games/[id]:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!data) return notFound();

  return NextResponse.json({
    game: ladderRowToRecord(data as LadderGameRow),
  });
}

/** 부분 수정 (참가자·결과·제목) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  await requireApprovedMember(supabase);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const patch = parsePatchBody(body);
  if (!patch) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("ladder_games")
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("PATCH /api/ladder-games/[id] fetch:", fetchError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!existing) return notFound();

  const row = existing as LadderGameRow;
  if (row.played_at) {
    return NextResponse.json({ error: "already_played" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    updatePayload.title = patch.title.trim() || "이름 없는 사다리";
  }
  if (
    patch.participantNames &&
    patch.participantNames.length === row.participant_count
  ) {
    updatePayload.participant_names = patch.participantNames;
  }
  if (patch.resultItems && patch.resultItems.length === row.participant_count) {
    updatePayload.result_items = patch.resultItems;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({
      game: ladderRowToRecord(row),
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update(updatePayload)
    .eq("id", id)
    .select(
      "id,title,participant_count,participant_names,result_items,rungs,diagonal_rungs,row_count,author_user_id,author_name,created_at,played_at",
    )
    .single();

  if (updateError || !updated) {
    console.error("PATCH /api/ladder-games/[id]:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({
    game: ladderRowToRecord(updated as LadderGameRow),
  });
}

/** 삭제 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const { data: existing, error: fetchError } = await supabase
    .from("ladder_games")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("DELETE /api/ladder-games/[id] fetch:", fetchError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!existing) return notFound();

  const { error } = await supabase.from("ladder_games").delete().eq("id", id);

  if (error) {
    console.error("DELETE /api/ladder-games/[id]:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
