import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import {
  toSeatingChartListItem,
  type SeatingChartRecord,
} from "@/lib/seating";

import GroupTabsLoader from "../_components/GroupTabsLoader";
import SeatingChartList from "../_components/SeatingChartList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "자리배치도",
  description: "관리자 패널에서 강의실 자리배치를 확인·관리합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 자리배치도 게시판 목록
 */
export default async function AdminSeatingPage({
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

  const buildChartsQuery = () => {
    const query = supabase
      .from("seating_charts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!filterGroup) return query;

    if (LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number])) {
      const escaped = filterGroup.replace(/"/g, '""');
      return query.or(`group_name.is.null,group_name.eq."${escaped}"`);
    }
    return query.eq("group_name", filterGroup);
  };

  const [chartsResult, profilesResult] = await Promise.all([
    buildChartsQuery(),
    supabase
      .from("profiles")
      .select("group_name")
      .neq("role", "admin")
      .eq("is_dormant", false),
  ]);

  if (chartsResult.error) {
    console.error("자리배치도 목록 조회 오류:", chartsResult.error);
  }

  const charts = (chartsResult.data ?? []).map((record) =>
    toSeatingChartListItem(record as SeatingChartRecord),
  );

  const profiles = profilesResult.data ?? [];
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

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : "";

  const newChartHref = filterGroup
    ? `/admin/seating/new?group=${encodeURIComponent(filterGroup)}`
    : "/admin/seating/new";

  return (
    <>
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
          </Suspense>
        </div>

        <SeatingChartList
          charts={charts}
          newChartHref={newChartHref}
          groupQuery={groupQuery}
        />
    </>
  );
}
