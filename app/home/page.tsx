import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 세션별로 다른 데이터를 보여주므로 캐싱 방지
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /home 은 별도 페이지(/homework, /progress, /survey)로 분리되었으므로
 * 진입 시 적절한 경로로 리다이렉트합니다.
 * - 로그인 사용자 → /homework (오늘의 과제)
 * - 비로그인 사용자 → / (랜딩 페이지)
 */
export default async function HomeRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser?.id) {
    redirect("/homework");
  }

  redirect("/");
}
