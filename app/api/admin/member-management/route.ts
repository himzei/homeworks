import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

const ALLOWED_ACTIONS = ["approve", "reject", "withdraw"] as const;

/**
 * 관리자 전용 — 회원 승인·거절·탈퇴(휴면) 처리
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
        { error: "관리자만 회원을 관리할 수 있습니다." },
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
        { error: "action은 approve, reject, withdraw 중 하나여야 합니다." },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, role, name, approval_status, is_dormant")
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
        { error: "관리자 계정은 변경할 수 없습니다." },
        { status: 400 },
      );
    }

    if (action === "withdraw") {
      if (target.is_dormant) {
        return NextResponse.json(
          { error: "이미 휴면 처리된 회원입니다." },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_dormant: true,
          group_name: null,
          class_officer_role: null,
          team_number: null,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("탈퇴(휴면) 처리 실패:", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "탈퇴 처리에 실패했습니다." },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        userId,
        isDormant: true,
        memberName: target.name,
      });
    }

    const nextStatus =
      action === "approve"
        ? PROFILE_APPROVAL_STATUS.approved
        : PROFILE_APPROVAL_STATUS.rejected;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        approval_status: nextStatus,
        // 승인 시 휴면 해제는 하지 않음 — 탈퇴 후 재가입은 별도 절차
      })
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
    console.error("POST /api/admin/member-management:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
