import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";

function parseBody(body: unknown): { optionId: string; voterName: string } | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const optionId = typeof raw.optionId === "string" ? raw.optionId : "";
  const voterName = typeof raw.voterName === "string" ? raw.voterName : "";
  return { optionId, voterName };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { user, profile } = await requireApprovedMember(supabase);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = parseBody(body);
  const optionId = parsed?.optionId ?? "";
  if (!optionId) {
    return NextResponse.json({ error: { kind: "invalid_option" } }, { status: 400 });
  }

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (voteError) {
    console.error("PUT /api/votes/[id]/ballots get vote:", voteError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!vote) {
    return NextResponse.json({ error: { kind: "not_found" } }, { status: 404 });
  }

  const voteStatus = (vote as { status: string }).status;
  if (voteStatus !== "active") {
    return NextResponse.json({ error: { kind: "not_active" } }, { status: 400 });
  }

  // option이 해당 vote에 속하는지 확인
  const { data: option, error: optionError } = await supabase
    .from("vote_options")
    .select("id")
    .eq("vote_id", id)
    .eq("id", optionId)
    .maybeSingle();

  if (optionError) {
    console.error("PUT /api/votes/[id]/ballots option:", optionError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!option) {
    return NextResponse.json({ error: { kind: "invalid_option" } }, { status: 400 });
  }

  const profileName = typeof profile?.name === "string" ? profile.name.trim() : "";
  // 서버에서 email을 쓰지 않고(타입/노출 최소화), 프로필명 또는 입력값만 사용
  const normalizedVoterName = (parsed?.voterName?.trim() || profileName || "이름 없음").trim();

  // upsert (vote_id + user_id PK)
  const { error: upsertError } = await supabase
    .from("vote_ballots")
    .upsert(
      {
        vote_id: id,
        user_id: user.id,
        option_id: optionId,
        voter_name: normalizedVoterName,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "vote_id,user_id" },
    );

  if (upsertError) {
    console.error("PUT /api/votes/[id]/ballots upsert:", upsertError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

