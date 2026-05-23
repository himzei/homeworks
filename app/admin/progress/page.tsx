import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Users } from "lucide-react";

import ProgressGrid from "@/app/_components/ProgressGrid";
import { createClient } from "@/lib/supabase/server";
import { fetchProgressGridData } from "@/lib/fetch-progress-grid-data";

import AdminSubNav from "../_components/AdminSubNav";
import GroupTabs from "../_components/GroupTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "진행과정",
  description: "과정별 학생 숙제 제출 진행 현황을 그리드로 확인합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 진행과정 페이지
 * - home?tab=progress와 동일한 ProgressGrid를 관리자 패널에서 제공
 * - GroupTabs로 과정(기수) 필터링
 */
export default async function AdminProgressPage({
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

  // GroupTabs 배지용 학생 수 집계
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("group_name")
    .neq("role", "admin");

  const profiles = allProfiles ?? [];
  const unsetGroupCount = profiles.filter((profile) => !profile.group_name).length;

  const studentCountsByGroup: Record<string, number> = {
    all: profiles.length,
  };
  for (const profile of profiles) {
    const groupKey = profile.group_name;
    if (groupKey) {
      studentCountsByGroup[groupKey] =
        (studentCountsByGroup[groupKey] ?? 0) + 1;
    }
  }
  for (const key of Object.keys(studentCountsByGroup)) {
    if (key !== "all") {
      studentCountsByGroup[key] += unsetGroupCount;
    }
  }

  const { assignments, users, progressData } = await fetchProgressGridData(
    supabase,
    {
      filterGroup,
      currentUserId: user.id,
    },
  );

  const scopeDescription = filterGroup
    ? `${filterGroup} · 해당 과정 학생과 과제만 표시합니다.`
    : "모든 과정의 학생·과제를 표시합니다. 기수 탭에서 특정 과정을 선택하면 범위를 좁힐 수 있습니다.";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 flex items-center gap-2">
                <Users className="size-7 shrink-0" />
                진행과정
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {scopeDescription}
              </p>
            </div>
            <Link
              href="/home?tab=progress"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              학생 화면에서 보기 →
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabs
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
          </Suspense>
        </div>

        <div className="w-full overflow-auto max-h-[calc(100vh-280px)] rounded-lg">
          <ProgressGrid
            currentUserId={user.id}
            assignments={assignments}
            users={users}
            progressData={progressData}
          />
        </div>
      </main>
    </div>
  );
}
