import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  forcedLargestRuleRowToRecord,
  type LadderGroupForcedLargestRuleRow,
} from "@/lib/ladder-group-forced-largest";

/**
 * GET ?group=과정명 — 해당 기수 5인 조 고정 규칙 목록
 * POST { groupName, studentName } — 규칙 추가
 * DELETE { id } — 규칙 삭제
 */

export async function GET(request: Request) {
  const session = await verifyAdminSession();
  if (session.error) {
    return NextResponse.json(
      { error: session.error },
      { status: session.user ? 403 : 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const groupName = (searchParams.get("group") ?? "").trim();
  if (!groupName || groupName === "all") {
    return NextResponse.json({ error: "group_required" }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("ladder_group_forced_largest_team_rules")
    .select("id, group_name, student_name, created_at")
    .eq("group_name", groupName)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET /api/admin/ladder-forced-largest-rules:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  const rules =
    (data as LadderGroupForcedLargestRuleRow[] | null)?.map(
      forcedLargestRuleRowToRecord,
    ) ?? [];

  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await verifyAdminSession();
  if (session.error || !session.user) {
    return NextResponse.json(
      { error: session.error ?? "로그인이 필요합니다." },
      { status: session.user ? 403 : 401 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const groupName =
    typeof raw.groupName === "string" ? raw.groupName.trim() : "";
  const studentName =
    typeof raw.studentName === "string" ? raw.studentName.trim() : "";

  if (!groupName) {
    return NextResponse.json({ error: "group_required" }, { status: 400 });
  }
  if (!studentName) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("ladder_group_forced_largest_team_rules")
    .insert({
      group_name: groupName,
      student_name: studentName,
      created_by: session.user.id,
    })
    .select("id, group_name, student_name, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "duplicate_name" }, { status: 409 });
    }
    console.error("POST /api/admin/ladder-forced-largest-rules:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json(
    {
      rule: forcedLargestRuleRowToRecord(
        data as LadderGroupForcedLargestRuleRow,
      ),
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const session = await verifyAdminSession();
  if (session.error) {
    return NextResponse.json(
      { error: session.error },
      { status: session.user ? 403 : 401 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const id =
    body &&
    typeof body === "object" &&
    typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id.trim()
      : "";

  if (!id) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { error } = await session.supabase
    .from("ladder_group_forced_largest_team_rules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /api/admin/ladder-forced-largest-rules:", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
