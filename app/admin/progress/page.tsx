import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ProgressGrid from "@/app/_components/ProgressGrid";
import { createClient } from "@/lib/supabase/server";
import { fetchProgressGridData } from "@/lib/fetch-progress-grid-data";

import GroupTabsLoader from "../_components/GroupTabsLoader";

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
  const isExplicitGroup = !!selectedGroupParam && selectedGroupParam !== "all";
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

  const { assignments, users, progressData } = await fetchProgressGridData(
    supabase,
    {
      filterGroup,
      currentUserId: user.id,
    },
  );

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader selectedGroup={selectedGroupParam} />
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
    </>
  );
}
