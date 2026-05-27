import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * 관리자만: 관련뉴스 게시물 삭제
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "게시물 ID가 필요합니다." }, { status: 400 });
    }

    const auth = await verifyAdminSession();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const service = getServiceRoleClient();
    const db = service ?? auth.supabase;

    const { error: deleteError } = await db.from("related_news").delete().eq("id", id);

    if (deleteError) {
      console.error("DELETE /api/related-news/[id]:", deleteError);
      return NextResponse.json(
        { error: deleteError.message ?? "삭제에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/related-news/[id]:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
