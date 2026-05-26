import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import type { LadderVoteRecord } from "@/lib/ladder-votes";

type VoteRow = {
  id: string;
  title: string;
  description: string | null;
  is_anonymous: boolean;
  status: "draft" | "active" | "closed";
  author_user_id: string;
  author_name: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

type VoteOptionRow = { id: string; label: string };
type VoteBallotRow = {
  user_id: string;
  option_id: string;
  voter_name: string;
  voted_at: string;
};

function toEpochMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function notFound() {
  return NextResponse.json({ error: { kind: "not_found" } }, { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { user } = await requireApprovedMember(supabase);

  // RLS가 draft 접근을 작성자에게만 허용하므로, 여기서도 그대로 따름
  const { data: vote, error } = await supabase
    .from("votes")
    .select("id,title,description,is_anonymous,status,author_user_id,author_name,created_at,started_at,ended_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/votes/[id]:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (!vote) return notFound();

  const voteRow = vote as VoteRow;
  const isAuthor = voteRow.author_user_id === user.id;

  // draft는 작성자만 (RLS로도 막히지만, 안정성 위해 한 번 더)
  if (voteRow.status === "draft" && !isAuthor) return notFound();

  // options / ballots 병렬 조회
  const optionsPromise = supabase
    .from("vote_options")
    .select("id,label")
    .eq("vote_id", id)
    .order("created_at", { ascending: true });

  const ballotsPromise = supabase
    .from("vote_ballots")
    .select("user_id,option_id,voter_name,voted_at")
    .eq("vote_id", id)
    .order("voted_at", { ascending: true });

  const [{ data: options, error: optionsError }, { data: ballots, error: ballotsError }] =
    await Promise.all([optionsPromise, ballotsPromise]);

  if (optionsError) {
    console.error("GET /api/votes/[id] options:", optionsError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  if (ballotsError) {
    console.error("GET /api/votes/[id] ballots:", ballotsError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const record: LadderVoteRecord = {
    id: voteRow.id,
    title: voteRow.title,
    description: voteRow.description ?? "",
    isAnonymous: voteRow.is_anonymous,
    options: (options as VoteOptionRow[]).map((o) => ({ id: o.id, label: o.label })),
    status: voteRow.status,
    authorUserId: voteRow.author_user_id,
    authorName: voteRow.author_name,
    createdAt: toEpochMs(voteRow.created_at) ?? Date.now(),
    startedAt: toEpochMs(voteRow.started_at),
    endedAt: toEpochMs(voteRow.ended_at),
    ballots: (ballots as VoteBallotRow[]).map((b) => ({
      userId: b.user_id,
      optionId: b.option_id,
      voterName: b.voter_name,
      votedAt: toEpochMs(b.voted_at) ?? Date.now(),
    })),
  };

  return NextResponse.json({ vote: record });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { user } = await requireApprovedMember(supabase);

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .select("id,author_user_id")
    .eq("id", id)
    .maybeSingle();

  if (voteError) {
    console.error("DELETE /api/votes/[id] get vote:", voteError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
  if (!vote) return notFound();

  if ((vote as { author_user_id: string }).author_user_id !== user.id) {
    return NextResponse.json({ error: { kind: "not_author" } }, { status: 403 });
  }

  const { error } = await supabase.from("votes").delete().eq("id", id);

  if (error) {
    console.error("DELETE /api/votes/[id]:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

