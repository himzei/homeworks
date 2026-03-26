import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const ALLOWED_STATUS = ["검토중", "승인", "수정필요", "모범답안"] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

/**
 * 관리자만: 숙제 제출(homeworks)의 status를 DB에 반영.
 * - 세션 기반 Supabase 클라이언트로 시도 (RLS의 admin 정책)
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

    if (service) {
      const { data: homework, error: findError } = await service
        .from("homeworks")
        .select("id")
        .eq("user_id", userId)
        .eq("assignment_id", assignmentId)
        .maybeSingle();

      if (findError) {
        console.error("homework lookup (service):", findError);
        return NextResponse.json(
          { error: findError.message ?? "조회에 실패했습니다." },
          { status: 400 },
        );
      }
      if (!homework) {
        return NextResponse.json(
          { error: "제출을 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      const { error: updateError } = await service
        .from("homeworks")
        .update({ status })
        .eq("id", homework.id);

      if (updateError) {
        console.error("homework update (service):", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "업데이트에 실패했습니다." },
          { status: 400 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    const { data: homework, error: findError } = await supabase
      .from("homeworks")
      .select("id")
      .eq("user_id", userId)
      .eq("assignment_id", assignmentId)
      .maybeSingle();

    if (findError) {
      console.error("homework lookup:", findError);
      return NextResponse.json(
        { error: findError.message ?? "조회에 실패했습니다." },
        { status: 400 },
      );
    }
    if (!homework) {
      return NextResponse.json(
        { error: "제출을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabase
      .from("homeworks")
      .update({ status })
      .eq("id", homework.id);

    if (updateError) {
      console.error("homework update:", updateError);
      return NextResponse.json(
        {
          error:
            updateError.message ??
            "업데이트에 실패했습니다. Supabase에 관리자 UPDATE 정책 또는 SUPABASE_SERVICE_ROLE_KEY를 확인하세요.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/homework-status:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
