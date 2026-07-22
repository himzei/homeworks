import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  LADDER_ROW_COUNT,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  buildLadderRespectingExclusions,
  type CreateLadderGameInput,
} from "@/lib/ladder";
import {
  resolveEffectiveLadderConstraints,
  withEffectiveLadderConstraints,
} from "@/lib/ladder-effective-constraints";
import { fetchAuthorCourseNameByUserId } from "@/lib/fetch-author-course-names";
import {
  LADDER_GAME_SELECT,
  ladderRowToRecord,
  type LadderGameRow,
} from "@/lib/ladder-db";

function parseCreateBody(body: unknown): CreateLadderGameInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title : "";
  const participantCount =
    typeof raw.participantCount === "number" ? raw.participantCount : 0;

  const participantNames = Array.isArray(raw.participantNames)
    ? raw.participantNames.filter((v): v is string => typeof v === "string")
    : undefined;

  const resultItems = Array.isArray(raw.resultItems)
    ? raw.resultItems.filter((v): v is string => typeof v === "string")
    : undefined;

  const groupName =
    typeof raw.groupName === "string" ? raw.groupName.trim() || null : undefined;

  return {
    title,
    participantCount,
    participantNames,
    resultItems,
    groupName,
  };
}

/** 목록 조회 (최신순) */
export async function GET() {
  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const { data, error } = await supabase
    .from("ladder_games")
    .select(LADDER_GAME_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/ladder-games:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const rows = data as LadderGameRow[];
  const courseNameByUserId = await fetchAuthorCourseNameByUserId(
    supabase,
    rows.map((row) => row.author_user_id),
  );

  const games = await Promise.all(
    rows.map(async (row) => {
      let record = await withEffectiveLadderConstraints(
        supabase,
        ladderRowToRecord(row),
      );
      const authorCourseName =
        (row.author_user_id
          ? courseNameByUserId.get(row.author_user_id)
          : null) ?? undefined;
      return authorCourseName
        ? { ...record, authorCourseName }
        : record;
    }),
  );

  return NextResponse.json({ games });
}

/** 새 사다리게임 생성 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, profile } = await requireApprovedMember(supabase);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = parseCreateBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const participantCount = parsed.participantCount;
  if (
    participantCount < MIN_PARTICIPANTS ||
    participantCount > MAX_PARTICIPANTS
  ) {
    return NextResponse.json({ error: "count_out_of_range" }, { status: 400 });
  }

  const authorName =
    typeof profile?.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : "작성자";

  const emptyArray = Array.from({ length: participantCount }, () => "");
  const participantNames =
    parsed.participantNames?.length === participantCount
      ? parsed.participantNames
      : emptyArray;
  const resultItems =
    parsed.resultItems?.length === participantCount
      ? parsed.resultItems
      : emptyArray;
  const groupName = parsed.groupName?.trim() || null;

  const { exclusionPairs, forcedLargestTeamNames } =
    await resolveEffectiveLadderConstraints(supabase, {
      groupName,
      participantNames,
    });

  const ladder = buildLadderRespectingExclusions(
    participantCount,
    participantNames,
    resultItems,
    exclusionPairs,
    forcedLargestTeamNames,
  );
  if (!ladder) {
    return NextResponse.json(
      { error: "exclusion_unsatisfiable" },
      { status: 400 },
    );
  }

  const { data: created, error } = await supabase
    .from("ladder_games")
    .insert({
      title: parsed.title.trim() || "이름 없는 사다리",
      participant_count: participantCount,
      participant_names: participantNames,
      result_items: resultItems,
      rungs: ladder.rungs,
      diagonal_rungs: ladder.diagonalRungs,
      row_count: LADDER_ROW_COUNT,
      author_user_id: user.id,
      author_name: authorName,
      exclusion_pairs: [],
      group_name: groupName,
    })
    .select(LADDER_GAME_SELECT)
    .single();

  if (error || !created) {
    console.error("POST /api/ladder-games:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const record = await withEffectiveLadderConstraints(
    supabase,
    ladderRowToRecord(created as LadderGameRow),
  );

  return NextResponse.json({ game: record }, { status: 201 });
}
