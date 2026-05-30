import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import LearningStatusAssignmentProgress from "@/app/_components/LearningStatusAssignmentProgress";
import LearningStatusCollectedBadges from "@/app/_components/LearningStatusCollectedBadges";
import LearningStatusMyInfo from "@/app/_components/LearningStatusMyInfo";
import LearningStatusTeamComposition from "@/app/_components/LearningStatusTeamComposition";
import { fetchLearningStatusTeamComposition } from "@/lib/fetch-learning-status-team-composition";
import { fetchProfileCollectedHonorBadges } from "@/lib/honor-badges";
import { fetchUserAssignmentProgress } from "@/lib/fetch-user-assignment-progress";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "학습현황",
  description: "내 정보, 과제 제출 현황, 현재 팀 구성을 확인합니다.",
};

/** 로그인 회원 — 내 정보 + 과제 제출 현황 */
export default async function LearningStatusPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?login_required=1&redirect=/learning-status");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "name, group_name, phone, university, major, is_graduated, github_url, bio, avatar_url, is_dormant, created_at",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/profile");
  }

  const courseGroupName = profile.group_name?.trim() || null;
  const [assignmentProgress, collectedBadges, teamComposition] =
    await Promise.all([
      fetchUserAssignmentProgress(
        supabase,
        user.id,
        courseGroupName,
        profile.created_at,
      ),
      fetchProfileCollectedHonorBadges(supabase, user.id, courseGroupName),
      fetchLearningStatusTeamComposition(supabase, user.id, courseGroupName),
    ]);

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="container flex min-h-full w-full flex-col gap-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              학습현황
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              내 정보, 과제 제출 현황, 현재 팀 구성을 확인할 수 있습니다.
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="size-4" />
            과제 홈
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,240px)_1fr] lg:items-stretch">
          <LearningStatusMyInfo profile={profile} />
          <LearningStatusCollectedBadges badges={collectedBadges} />
        </div>
        <LearningStatusAssignmentProgress progress={assignmentProgress} />
        <LearningStatusTeamComposition composition={teamComposition} />
      </main>
    </div>
  );
}
