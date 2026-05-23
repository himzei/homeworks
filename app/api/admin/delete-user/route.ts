import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * 관리자 전용 - 회원(학생) 완전 삭제
 *
 * - 관리자 권한 확인 (현재 로그인 사용자가 admin인지)
 * - 자기 자신 삭제 금지
 * - 다른 관리자 삭제 금지 (실수/악의 방지)
 * - SUPABASE_SERVICE_ROLE_KEY 가 있을 때만 동작
 * - auth.users에서 삭제하면 ON DELETE CASCADE로 profiles, homeworks,
 *   consultations, consultation_logs, survey_responses 등 모두 자동 삭제됨
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1) 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2) 관리자 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자만 회원을 삭제할 수 있습니다." },
        { status: 403 },
      );
    }

    // 3) 요청 바디 검증
    const body = await request.json().catch(() => ({}));
    const { userId } = body as { userId?: string };

    if (typeof userId !== "string" || !userId) {
      return NextResponse.json(
        { error: "삭제할 회원 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // 4) 자기 자신은 이 화면에서 삭제 불가
    if (userId === user.id) {
      return NextResponse.json(
        { error: "본인 계정은 이 화면에서 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    // 5) 서비스 롤 클라이언트 확인 (auth.admin API는 서비스 키 필수)
    const service = getServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        {
          error:
            "회원 삭제 권한이 설정되지 않았습니다. SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요.",
        },
        { status: 500 },
      );
    }

    // 6) 대상이 관리자면 삭제 거부 (실수/악의 방지)
    const { data: targetProfile, error: targetError } = await service
      .from("profiles")
      .select("role, name")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      console.error("대상 프로필 조회 실패:", targetError);
      return NextResponse.json(
        { error: targetError.message ?? "회원 정보를 확인할 수 없습니다." },
        { status: 400 },
      );
    }

    if (!targetProfile) {
      return NextResponse.json(
        { error: "해당 회원을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (targetProfile.role === "admin") {
      return NextResponse.json(
        { error: "관리자 계정은 이 화면에서 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    // 7) auth.users 삭제 → ON DELETE CASCADE 로 관련 데이터 모두 제거
    const { error: deleteError } = await service.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("auth user 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: deleteError.message ?? "회원 삭제에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      deletedName: targetProfile.name ?? null,
    });
  } catch (e) {
    console.error("POST /api/admin/delete-user:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
