import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isApprovedMember,
  PROFILE_APPROVAL_STATUS,
} from "@/lib/profile-approval";

export type MemberProfileRow = {
  id: string;
  role: string | null;
  approval_status: string | null;
  group_name: string | null;
  name: string | null;
  is_dormant: boolean | null;
};

/**
 * 로그인·승인된 회원만 통과 (관리자 포함)
 * - 미로그인 → 로그인 유도
 * - 프로필 없음 → /profile
 * - 승인 대기/거절 → /pending-approval
 */
export async function requireApprovedMember(
  supabase: SupabaseClient,
): Promise<{ user: { id: string }; profile: MemberProfileRow }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, approval_status, group_name, name, is_dormant")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("프로필 조회 오류:", error);
  }

  if (!profile) {
    redirect("/profile");
  }

  if (profile.role === "admin") {
    return { user, profile };
  }

  if (profile.approval_status === PROFILE_APPROVAL_STATUS.rejected) {
    redirect("/pending-approval?status=rejected");
  }

  if (profile.approval_status === PROFILE_APPROVAL_STATUS.pending) {
    redirect("/pending-approval");
  }

  if (profile.is_dormant) {
    redirect("/pending-approval?status=dormant");
  }

  if (!isApprovedMember(profile)) {
    redirect("/pending-approval");
  }

  return { user, profile };
}
