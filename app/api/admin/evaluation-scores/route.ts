import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * POST: 추가 필드 점수 저장(upsert) { userId, fieldId, score }
 */
export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { userId, fieldId, score } = body as {
      userId?: string;
      fieldId?: string;
      score?: number;
    };

    if (typeof userId !== "string" || typeof fieldId !== "string") {
      return NextResponse.json({ error: "필수 항목이 없습니다." }, { status: 400 });
    }

    const parsedScore =
      typeof score === "number" && Number.isFinite(score)
        ? Math.round(score)
        : Number.parseInt(String(score ?? ""), 10);

    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 999) {
      return NextResponse.json(
        { error: "점수는 0~999 사이의 숫자여야 합니다." },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase;
    if (!db) {
      return NextResponse.json({ error: "DB 연결에 실패했습니다." }, { status: 500 });
    }

    const { error: upsertError } = await db.from("evaluation_extra_scores").upsert(
      {
        user_id: userId,
        field_id: fieldId,
        score: parsedScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "field_id,user_id" },
    );

    if (upsertError) {
      console.error("evaluation-scores POST:", upsertError);
      return NextResponse.json(
        { error: upsertError.message ?? "점수 저장에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, score: parsedScore });
  } catch (e) {
    console.error("POST /api/admin/evaluation-scores:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
