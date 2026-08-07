import { redirect } from "next/navigation";
import { Suspense } from "react";

import ExamMiniProjectEvaluationTab from "@/app/admin/_components/ExamMiniProjectEvaluationTab";
import GroupTabsLoader from "@/app/admin/_components/GroupTabsLoader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "시험평가 및 미니프로젝트평가",
  description:
    "기수별 시험·미니프로젝트 평가 항목을 만들고 학생 점수를 입력합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 — 시험평가 및 미니프로젝트평가
 */
export default async function AdminExamEvaluationsPage({
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
        <h1 className="text-xl font-bold text-black sm:text-2xl dark:text-zinc-50">
          시험평가 및 미니프로젝트평가
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          기수를 선택한 뒤 평가 항목을 추가하고 학생별 점수를 입력하세요. 점수는
          최종 평가에 자동으로 반영됩니다.
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader selectedGroup={selectedGroupParam} />
        </Suspense>
      </div>

      <ExamMiniProjectEvaluationTab selectedGroup={filterGroup} />
    </>
  );
}
