import { createClient } from "@/lib/supabase/server";

/** 관리자 세션 검증 — 실패 시 null */
export async function verifyAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "로그인이 필요합니다." as const };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { supabase, user: null, error: "관리자만 사용할 수 있습니다." as const };
  }

  return { supabase, user, error: null };
}
