import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { user } = await requireApprovedMember(supabase);

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .select("id,author_user_id,status")
    .eq("id", id)
    .maybeSingle();

  if (voteError) {
    console.error("POST /api/votes/[id]/start get vote:", voteError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!vote) {
    return NextResponse.json({ error: { kind: "not_found" } }, { status: 404 });
  }

  const row = vote as { author_user_id: string; status: string };
  if (row.author_user_id !== user.id) {
    return NextResponse.json({ error: { kind: "not_author" } }, { status: 403 });
  }
  if (row.status !== "draft") {
    return NextResponse.json({ error: { kind: "not_draft" } }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("votes")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("POST /api/votes/[id]/start update:", updateError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

