import { redirect } from "next/navigation";

import PendingMemberApprovalList, {
  type PendingMemberItem,
} from "@/app/admin/_components/PendingMemberApprovalList";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "회원 승인",
  description: "신규 가입 회원의 승인·거절을 처리합니다.",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * 관리자 — 가입 승인 대기 회원 관리
 */
export default async function AdminMembersApprovalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  const { data: pendingMembers, error } = await supabase
    .from("profiles")
    .select("id, name, group_name, phone, created_at, approval_status")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.pending)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("승인 대기 회원 조회 오류:", error);
  }

  const members: PendingMemberItem[] = (pendingMembers ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() || "(이름 없음)",
    groupName: row.group_name,
    phone: row.phone,
    createdAtLabel: dateFormatter.format(new Date(row.created_at)),
    approvalStatus: row.approval_status,
  }));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
          회원 가입 승인
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          신규 회원가입은 관리자 승인 후 서비스에 등록됩니다. 최신 신청순으로
          표시됩니다.
        </p>
      </div>

      <PendingMemberApprovalList members={members} />
    </>
  );
}
