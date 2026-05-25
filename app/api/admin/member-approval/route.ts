import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

const ALLOWED_ACTIONS = ["approve", "reject"] as const;

/**
 * 관리자 전용 — 회원 가입 승인/거절
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 회원을 승인할 수 있습니다." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId, action } = body as {
      userId?: string;
      action?: (typeof ALLOWED_ACTIONS)[number];
    };

    if (typeof userId !== "string" || !userId) {
      return NextResponse.json(
        { error: "회원 ID가 필요합니다." },
        { status: 400 },
      );
    }

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "action은 approve 또는 reject 여야 합니다." },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, role, name, approval_status")
      .eq("id", userId)
      .maybeSingle();

    if (targetError || !target) {
      return NextResponse.json(
        { error: "해당 회원을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (target.role === "admin") {
      return NextResponse.json(
        { error: "관리자 계정은 승인 처리할 수 없습니다." },
        { status: 400 },
      );
    }

    const nextStatus =
      action === "approve"
        ? PROFILE_APPROVAL_STATUS.approved
        : PROFILE_APPROVAL_STATUS.rejected;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ approval_status: nextStatus })
      .eq("id", userId);

    if (updateError) {
      console.error("승인 상태 변경 실패:", updateError);
      return NextResponse.json(
        { error: updateError.message ?? "승인 처리에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      userId,
      approvalStatus: nextStatus,
      memberName: target.name,
    });
  } catch (error) {
    console.error("POST /api/admin/member-approval:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
