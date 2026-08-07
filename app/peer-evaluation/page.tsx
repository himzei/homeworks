import type { Metadata } from "next";
import { redirect } from "next/navigation";

import PeerEvaluationAllCohortsBoard from "@/app/peer-evaluation/_components/PeerEvaluationAllCohortsBoard";
import PeerEvaluationStudentBoard from "@/app/peer-evaluation/_components/PeerEvaluationStudentBoard";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  fetchPeerEvaluationProjectsForAdmin,
  fetchPeerEvaluationProjectsForMember,
} from "@/lib/peer-evaluation/fetch-projects";
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

  // 관리자는 소속 기수와 무관하게 모든 기수의 동료평가를 확인
  if (isAdmin) {
    const allProjects = await fetchPeerEvaluationProjectsForAdmin(
      supabase,
      null,
    );

    return (
      <div className="container mx-auto px-4 py-6 sm:px-8 sm:py-10">
        <PeerEvaluationAllCohortsBoard
          projects={allProjects}
          viewerGroupName={userGroupName}
        />
      </div>
    );
  }

  if (!userGroupName) {
    redirect("/profile?group_required=1");
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
