import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  buildLadderRespectingExclusions,
  type UpdateLadderGameInput,
} from "@/lib/ladder";
import {
  resolveEffectiveLadderConstraints,
  withEffectiveLadderConstraints,
} from "@/lib/ladder-effective-constraints";
import {
  LADDER_GAME_SELECT,
  ladderRowToRecord,
  type LadderGameRow,
} from "@/lib/ladder-db";

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
  if (raw.groupName !== undefined) {
    if (raw.groupName === null) {
      patch.groupName = null;
    } else if (typeof raw.groupName === "string") {
      patch.groupName = raw.groupName.trim() || null;
    } else {
      return null;
    }
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
    .select(LADDER_GAME_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/ladder-games/[id]:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!data) return notFound();

  const record = await withEffectiveLadderConstraints(
    supabase,
    ladderRowToRecord(data as LadderGameRow),
  );

  return NextResponse.json({ game: record });
}

/** 부분 수정 (참가자·결과·제목·기수) */
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
    .select(LADDER_GAME_SELECT)
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

  const current = ladderRowToRecord(row);
  const updatePayload: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    updatePayload.title = patch.title.trim() || "이름 없는 사다리";
  }

  const nextNames =
    patch.participantNames &&
    patch.participantNames.length === row.participant_count
      ? patch.participantNames
      : current.participantNames;
  if (patch.participantNames && nextNames === patch.participantNames) {
    updatePayload.participant_names = nextNames;
  }

  const nextResults =
    patch.resultItems && patch.resultItems.length === row.participant_count
      ? patch.resultItems
      : current.resultItems;
  if (patch.resultItems && nextResults === patch.resultItems) {
    updatePayload.result_items = nextResults;
  }

  const nextGroupName =
    patch.groupName !== undefined ? patch.groupName : current.groupName;
  if (patch.groupName !== undefined) {
    updatePayload.group_name = nextGroupName;
  }

  // 기수 금지·5인 조 고정이 있으면 이름·결과·기수 변경 시 사다리 재생성
  const shouldConsiderRebuild =
    patch.participantNames !== undefined ||
    patch.resultItems !== undefined ||
    patch.groupName !== undefined;

  if (shouldConsiderRebuild) {
    const { exclusionPairs, forcedLargestTeamNames } =
      await resolveEffectiveLadderConstraints(supabase, {
        groupName: nextGroupName,
        participantNames: nextNames,
        gameLevelPairs: current.exclusionPairs,
      });

    if (exclusionPairs.length > 0 || forcedLargestTeamNames.length > 0) {
      const ladder = buildLadderRespectingExclusions(
        row.participant_count,
        nextNames,
        nextResults,
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
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({
      game: await withEffectiveLadderConstraints(supabase, current),
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("ladder_games")
    .update(updatePayload)
    .eq("id", id)
    .select(LADDER_GAME_SELECT)
    .single();

  if (updateError || !updated) {
    console.error("PATCH /api/ladder-games/[id]:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({
    game: await withEffectiveLadderConstraints(
      supabase,
      ladderRowToRecord(updated as LadderGameRow),
    ),
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
