import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PeerEvaluationStudentBoard from "@/app/peer-evaluation/_components/PeerEvaluationStudentBoard";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { fetchPeerEvaluationProjectsForMember } from "@/lib/peer-evaluation/fetch-projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "동료평가",
  description: "같은 기수 동료를 평가합니다. 받은 점수는 공개되지 않습니다.",
  robots: { index: false, follow: false },
};

export default async function PeerEvaluationPage() {
  const supabase = await createClient();
  const { profile } = await requireApprovedMember(supabase);
  const isAdmin = profile.role === "admin";
  const userGroupName = profile.group_name?.trim() || null;

  if (!isAdmin && !userGroupName) {
    redirect("/profile?group_required=1");
  }

  // 관리자는 학생 화면에서 기수가 없으면 안내만 표시
  if (!userGroupName) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          관리자 계정에 소속 기수가 없습니다. 프로젝트 생성·결과 확인은{" "}
          <a
            href="/admin/peer-evaluations"
            className="font-medium text-blue-600 underline"
          >
            관리자 동료평가
          </a>
          에서 진행해 주세요.
        </p>
      </div>
    );
  }

  const projects = await fetchPeerEvaluationProjectsForMember(
    supabase,
    userGroupName,
  );

  return (
    <div className="container mx-auto px-4 py-6 sm:px-8 sm:py-10">
      <PeerEvaluationStudentBoard
        projects={projects}
        cohortLabel={userGroupName}
      />
    </div>
  );
}
