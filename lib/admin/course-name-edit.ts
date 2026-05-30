import type { SupabaseClient } from "@supabase/supabase-js";

import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

/** 승인된 회원이 과정명(group_name)으로 등록되어 있으면 과정명 수정 불가 */
export async function isCourseNameEditLocked(
  supabase: SupabaseClient,
  courseName: string,
): Promise<boolean> {
  const trimmedCourseName = courseName.trim();
  if (!trimmedCourseName) return false;

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("group_name", trimmedCourseName)
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
    .eq("is_dormant", false)
    .neq("role", "admin");

  if (error) {
    console.error("과정명 수정 잠금 여부 조회 오류:", error);
    throw error;
  }

  return (count ?? 0) > 0;
}
