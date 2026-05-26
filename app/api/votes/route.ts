import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { fetchAuthorCourseNameByUserId } from "@/lib/fetch-author-course-names";
import {
  MAX_VOTE_OPTIONS,
  MIN_VOTE_OPTIONS,
  type CreateLadderVoteInput,
  type LadderVoteRecord,
  type LadderVoteValidationError,
} from "@/lib/ladder-votes";

type VoteListRow = {
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

function toEpochMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function voteRowToRecord(
  row: VoteListRow,
  ballotsCount: number,
  authorCourseName?: string,
): LadderVoteRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    isAnonymous: row.is_anonymous,
    options: [],
    status: row.status,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    authorCourseName,
    createdAt: toEpochMs(row.created_at) ?? Date.now(),
    startedAt: toEpochMs(row.started_at),
    endedAt: toEpochMs(row.ended_at),
    // 목록 화면에서 기존 구현이 ballots.length만 사용해서
    // 서버에서 "표 수만큼" 더미 배열을 만들어 길이만 맞춰준다.
    // (상세 화면에서는 GET /api/votes/[id]를 다시 호출해 실제 ballots를 사용)
    ballots: Array.from({ length: ballotsCount }, () => ({
      userId: "",
      optionId: "",
      voterName: "",
      votedAt: 0,
    })),
  };
}

function parseCreateBody(body: unknown): CreateLadderVoteInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title : "";
  const description = typeof raw.description === "string" ? raw.description : "";
  const isAnonymous = typeof raw.isAnonymous === "boolean" ? raw.isAnonymous : false;
  const optionLabels = Array.isArray(raw.optionLabels)
    ? raw.optionLabels.filter((v) => typeof v === "string")
    : [];

  const authorUserId = typeof raw.authorUserId === "string" ? raw.authorUserId : "";
  const authorName = typeof raw.authorName === "string" ? raw.authorName : "";

  return {
    title,
    description,
    isAnonymous,
    optionLabels,
    authorUserId,
    authorName,
  };
}

function validateCreateInput(input: CreateLadderVoteInput): LadderVoteValidationError | null {
  if (!input.title.trim()) return { kind: "title_empty" };
  const trimmed = input.optionLabels.map((l) => l.trim()).filter(Boolean);
  if (trimmed.length < MIN_VOTE_OPTIONS) return { kind: "options_too_few" };
  if (trimmed.length > MAX_VOTE_OPTIONS) return { kind: "options_max_reached" };
  for (let i = 0; i < input.optionLabels.length; i += 1) {
    if (input.optionLabels[i] !== undefined && !input.optionLabels[i]?.trim()) {
      if (input.optionLabels.some((l) => l.trim())) return { kind: "option_empty", index: i };
    }
  }
  const lower = trimmed.map((t) => t.toLowerCase());
  if (new Set(lower).size !== lower.length) return { kind: "option_duplicate" };
  return null;
}

export async function GET() {
  const supabase = await createClient();
  await requireApprovedMember(supabase);

  // 투표 목록은 votes + ballots count 정도만 필요
  const { data: votes, error } = await supabase
    .from("votes")
    .select("id,title,description,is_anonymous,status,author_user_id,author_name,created_at,started_at,ended_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/votes:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  // ballots count를 한 번에 가져오는 RPC가 없으므로, 간단히 전체 ballots를 집계하지 않고
  // 목록 화면에서는 상세 들어가서 표 수를 확인해도 되지만, 기존 UI가 표 수를 보여줘서
  // vote_ballots를 vote_id 기준 count로 묶어 가져옴 (Supabase는 group-by를 직접 지원하지 않아
  // 여기서는 2회 조회로 처리)
  const { data: allBallots, error: ballotsError } = await supabase
    .from("vote_ballots")
    .select("vote_id");

  if (ballotsError) {
    console.error("GET /api/votes ballots:", ballotsError);
  }

  const countByVoteId = new Map<string, number>();
  for (const row of allBallots ?? []) {
    const voteId = (row as { vote_id: string }).vote_id;
    countByVoteId.set(voteId, (countByVoteId.get(voteId) ?? 0) + 1);
  }

  const voteRows = votes as VoteListRow[];
  const courseNameByUserId = await fetchAuthorCourseNameByUserId(
    supabase,
    voteRows.map((row) => row.author_user_id),
  );

  const records = voteRows.map((row) => {
    const authorCourseName =
      courseNameByUserId.get(row.author_user_id) ?? undefined;
    return voteRowToRecord(
      row,
      countByVoteId.get(row.id) ?? 0,
      authorCourseName,
    );
  });

  return NextResponse.json({ votes: records });
}

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
    return NextResponse.json({ error: { kind: "title_empty" } }, { status: 400 });
  }

  // 작성자는 서버에서 강제 (클라이언트 조작 방지)
  const authorName =
    typeof profile?.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : "작성자";
  const input: CreateLadderVoteInput = {
    ...parsed,
    authorUserId: user.id,
    authorName,
  };

  const validationError = validateCreateInput(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const trimmedLabels = input.optionLabels.map((l) => l.trim()).filter(Boolean);

  // votes 생성
  const { data: createdVote, error: createError } = await supabase
    .from("votes")
    .insert({
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      is_anonymous: input.isAnonymous,
      status: "draft",
      author_user_id: user.id,
      author_name: authorName,
    })
    .select("id,title,description,is_anonymous,status,author_user_id,author_name,created_at,started_at,ended_at")
    .single();

  if (createError || !createdVote) {
    console.error("POST /api/votes create:", createError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  // options 생성
  const { data: createdOptions, error: optionsError } = await supabase
    .from("vote_options")
    .insert(
      trimmedLabels.map((label) => ({
        vote_id: createdVote.id,
        label,
      })),
    )
    .select("id,label");

  if (optionsError) {
    console.error("POST /api/votes options:", optionsError);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const record: LadderVoteRecord = {
    id: createdVote.id,
    title: createdVote.title,
    description: createdVote.description ?? "",
    isAnonymous: createdVote.is_anonymous,
    options: (createdOptions ?? []).map((o) => ({
      id: (o as { id: string }).id,
      label: (o as { label: string }).label,
    })),
    status: createdVote.status,
    authorUserId: createdVote.author_user_id,
    authorName: createdVote.author_name,
    createdAt: toEpochMs(createdVote.created_at) ?? Date.now(),
    startedAt: toEpochMs(createdVote.started_at),
    endedAt: toEpochMs(createdVote.ended_at),
    ballots: [],
  };

  return NextResponse.json({ vote: record }, { status: 201 });
}

