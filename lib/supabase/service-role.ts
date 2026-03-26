import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 — RLS 우회. SUPABASE_SERVICE_ROLE_KEY가 있을 때만 사용.
 * 클라이언트에서 호출하지 말 것.
 */
export function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
