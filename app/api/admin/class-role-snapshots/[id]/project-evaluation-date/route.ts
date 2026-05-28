import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  date?: string | null;
};

function isValidDateString(value: string): boolean {
  // 한글 주석: HTML date input은 YYYY-MM-DD 형태를 사용한다.
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * PATCH: 프로젝트 평가일 저장 (DATE)
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const { id: snapshotId } = await context.params;
    const body = (await request.json()) as Body;

    const rawDate = body?.date;
    const date =
      rawDate === null
        ? null
        : typeof rawDate === "string"
          ? rawDate.trim()
          : "";

    if (date && !isValidDateString(date)) {
      return NextResponse.json(
        { error: "평가일 형식이 올바르지 않습니다. (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const { error } = await db
      .from("class_role_snapshots")
      .update({ project_evaluation_date: date || null })
      .eq("id", snapshotId);

    if (error) {
      console.error("project_evaluation_date 저장:", error);
      return NextResponse.json(
        { error: error.message ?? "저장에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, date: date || null });
  } catch (error) {
    console.error("PATCH project-evaluation-date:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

