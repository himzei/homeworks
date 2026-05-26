import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { MAX_VOTE_OPTIONS } from "@/lib/ladder-votes";

function parseBody(body: unknown): { label: string } | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label : "";
  return { label };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { user } = await requireApprovedMember(supabase);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = parseBody(body);
  const trimmedLabel = parsed?.label?.trim() ?? "";
  if (!trimmedLabel) {
    return NextResponse.json({ error: { kind: "option_label_empty" } }, { status: 400 });
  }

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .select("id,author_user_id,status")
    .eq("id", id)
    .maybeSingle();

  if (voteError) {
    console.error("POST /api/votes/[id]/options get vote:", voteError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!vote) {
    return NextResponse.json({ error: { kind: "not_found" } }, { status: 404 });
  }

  const voteRow = vote as { author_user_id: string; status: string };
  if (voteRow.author_user_id !== user.id) {
    return NextResponse.json({ error: { kind: "not_author" } }, { status: 403 });
  }
  if (voteRow.status !== "active") {
    return NextResponse.json({ error: { kind: "not_active" } }, { status: 400 });
  }

  const { data: options, error: optionsError } = await supabase
    .from("vote_options")
    .select("id,label")
    .eq("vote_id", id);

  if (optionsError) {
    console.error("POST /api/votes/[id]/options list:", optionsError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if ((options?.length ?? 0) >= MAX_VOTE_OPTIONS) {
    return NextResponse.json({ error: { kind: "options_max_reached" } }, { status: 400 });
  }

  const exists = (options ?? []).some(
    (o) => String((o as { label: string }).label).toLowerCase() === trimmedLabel.toLowerCase(),
  );
  if (exists) {
    return NextResponse.json({ error: { kind: "option_duplicate" } }, { status: 400 });
  }

  const { data: created, error: createError } = await supabase
    .from("vote_options")
    .insert({ vote_id: id, label: trimmedLabel })
    .select("id,label")
    .single();

  if (createError || !created) {
    console.error("POST /api/votes/[id]/options insert:", createError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ option: created }, { status: 201 });
}

