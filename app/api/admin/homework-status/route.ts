import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_SCORE_PLACEHOLDER_URL } from "@/lib/admin-score-placeholder";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const ALLOWED_STATUS = ["검토중", "승인", "수정필요", "모범답안"] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

/**
 * 관리자만: 숙제 제출(homeworks)의 status를 DB에 반영.
 * - 제출 행이 없으면 점수 전용 placeholder 행을 생성한 뒤 status 저장
 * - SUPABASE_SERVICE_ROLE_KEY가 있으면 관리자 검증 후 서비스 롤로 확실히 반영
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 변경할 수 있습니다." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, assignmentId, status } = body as {
      userId?: string;
      assignmentId?: string;
      status?: string;
    };

    if (
      typeof userId !== "string" ||
      typeof assignmentId !== "string" ||
      typeof status !== "string"
    ) {
      return NextResponse.json(
        { error: "필수 항목이 없습니다." },
        { status: 400 },
      );
    }

    if (!ALLOWED_STATUS.includes(status as AllowedStatus)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태입니다." },
        { status: 400 },
      );
    }

    const service = getServiceRoleClient();
    const db = service ?? supabase;
    const usedServiceRole = Boolean(service);

    const result = await upsertHomeworkStatus(db, userId, assignmentId, status);

    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.error ??
            (usedServiceRole
              ? "저장에 실패했습니다."
              : "저장에 실패했습니다. Supabase에 관리자 INSERT/UPDATE 정책 또는 SUPABASE_SERVICE_ROLE_KEY를 확인하세요."),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      placeholderUrl: result.created ? ADMIN_SCORE_PLACEHOLDER_URL : undefined,
    });
  } catch (e) {
    console.error("POST /api/admin/homework-status:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

async function upsertHomeworkStatus(
  db: SupabaseClient,
  userId: string,
  assignmentId: string,
  status: string,
): Promise<
  | { ok: true; created: boolean }
  | { ok: false; status: number; error: string }
> {
  const { data: homework, error: findError } = await db
    .from("homeworks")
    .select("id")
    .eq("user_id", userId)
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (findError) {
    console.error("homework lookup:", findError);
    return {
      ok: false,
      status: 400,
      error: findError.message ?? "조회에 실패했습니다.",
    };
  }

  if (homework) {
    const { error: updateError } = await db
      .from("homeworks")
      .update({ status })
      .eq("id", homework.id);

    if (updateError) {
      console.error("homework update:", updateError);
      return {
        ok: false,
        status: 400,
        error: updateError.message ?? "업데이트에 실패했습니다.",
      };
    }

    return { ok: true, created: false };
  }

  // 한글 주석: 미제출 학생 — 점수 전용 placeholder 행 생성
  const { error: insertError } = await db.from("homeworks").insert({
    user_id: userId,
    assignment_id: assignmentId,
    url: ADMIN_SCORE_PLACEHOLDER_URL,
    homework_number: 0,
    status,
  });

  if (insertError) {
    console.error("homework insert (admin score):", insertError);
    return {
      ok: false,
      status: 400,
      error: insertError.message ?? "점수 저장용 제출 생성에 실패했습니다.",
    };
  }

  return { ok: true, created: true };
}
