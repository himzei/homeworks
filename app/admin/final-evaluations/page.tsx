import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

import FinalEvaluationTab from "../_components/FinalEvaluationTab";
import GroupTabsLoader from "../_components/GroupTabsLoader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "최종 평가",
  description:
    "기수별 사전·본교육·과제·프로젝트 평가와 상담 내용, 교수 최종 평가를 작성합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 최종 평가 (기수별)
 */
export default async function AdminFinalEvaluationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedGroupParam = (params?.group as string) || null;
  const isExplicitGroup =
    !!selectedGroupParam && selectedGroupParam !== "all";
  const filterGroup = isExplicitGroup ? selectedGroupParam : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-zinc-50">
          최종 평가
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          기수를 선택한 뒤 학생별로 사전·본교육·과제·프로젝트 점수를 확인하고,
          상담 내용과 교수 최종 평가를 작성·저장할 수 있습니다.
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader selectedGroup={selectedGroupParam} />
        </Suspense>
      </div>

      <FinalEvaluationTab selectedGroup={filterGroup} />
    </>
  );
}
