import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LayoutGrid, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import {
  toSeatingChartListItem,
  type SeatingChartRecord,
} from "@/lib/seating";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../_components/AdminSubNav";
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
    supabase.from("profiles").select("group_name").neq("role", "admin"),
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

  const scopeDescription = filterGroup
    ? `${filterGroup} · 해당 과정의 자리배치도를 표시합니다.`
    : "모든 과정의 자리배치도를 표시합니다.";

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : "";

  const newChartHref = filterGroup
    ? `/admin/seating/new?group=${encodeURIComponent(filterGroup)}`
    : "/admin/seating/new";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 flex items-center gap-2">
                <LayoutGrid className="size-7 shrink-0" />
                자리배치도
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {scopeDescription}
              </p>
            </div>
            <Link href={newChartHref}>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <PencilLine className="size-4" />
                글쓰기
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

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
      </main>
    </div>
  );
}
