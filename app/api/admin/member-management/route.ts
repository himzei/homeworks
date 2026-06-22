import { NextResponse } from "next/server";

import { normalizeMemberGroupName } from "@/lib/admin/members-list-query";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

const ALLOWED_ACTIONS = ["approve", "reject", "withdraw", "updateGroup"] as const;

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
    const { userId, action, groupName } = body as {
      userId?: string;
      action?: (typeof ALLOWED_ACTIONS)[number];
      /** updateGroup 전용 — null 또는 빈 문자열이면 미분류 */
      groupName?: string | null;
    };

    if (typeof userId !== "string" || !userId) {
      return NextResponse.json(
        { error: "회원 ID가 필요합니다." },
        { status: 400 },
      );
    }

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          error:
            "action은 approve, reject, withdraw, updateGroup 중 하나여야 합니다.",
        },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, role, name, approval_status, is_dormant, group_name")
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

    if (action === "updateGroup") {
      if (groupName !== null && groupName !== undefined && typeof groupName !== "string") {
        return NextResponse.json(
          { error: "과정명 형식이 올바르지 않습니다." },
          { status: 400 },
        );
      }

      const normalizedGroupName = normalizeMemberGroupName(groupName);

      if (normalizedGroupName) {
        const { data: course, error: courseError } = await supabase
          .from("training_courses")
          .select("name")
          .eq("name", normalizedGroupName)
          .eq("is_active", true)
          .maybeSingle();

        if (courseError) {
          console.error("과정 검증 조회 실패:", courseError);
          return NextResponse.json(
            { error: "과정 정보를 확인하지 못했습니다." },
            { status: 500 },
          );
        }

        if (!course) {
          return NextResponse.json(
            { error: "선택한 과정을 찾을 수 없습니다." },
            { status: 400 },
          );
        }
      }

      const currentGroupName = normalizeMemberGroupName(target.group_name);
      if (currentGroupName === normalizedGroupName) {
        return NextResponse.json({
          ok: true,
          userId,
          groupName: normalizedGroupName,
          memberName: target.name,
        });
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          group_name: normalizedGroupName,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("과정 변경 실패:", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "과정 변경에 실패했습니다." },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        userId,
        groupName: normalizedGroupName,
        memberName: target.name,
      });
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
