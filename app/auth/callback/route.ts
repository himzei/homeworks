import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 이메일 확인 링크 클릭 시 Supabase가 리다이렉트하는 콜백
 * URL의 code를 세션으로 교환한 뒤 /profile로 이동 (신규 회원은 프로필 작성 필요)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/profile";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("auth/callback exchangeCodeForSession 오류:", error);
      return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : `/${next}`}`);
}
