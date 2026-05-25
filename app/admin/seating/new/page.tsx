import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchGroupOptions } from "@/lib/fetch-group-options";
import {
  buildCourseScheduleMap,
  buildSeatingChartDefaultTitle,
} from "@/lib/seating-chart-title";

import SeatingChartForm from "../../_components/SeatingChartForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "자리배치도 작성",
  description: "관리자 패널에서 새 자리배치도를 작성합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 자리배치도 작성 페이지
 */
export default async function AdminNewSeatingPage({
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

  const [groupOptions, coursesResult] = await Promise.all([
    fetchGroupOptions(supabase),
    supabase
      .from("training_courses")
      .select(
        "name, main_education_start_date, exclude_saturday, exclude_sunday, exclude_legal_holidays, exclude_substitute_holidays, custom_excluded_dates",
      )
      .eq("is_active", true),
  ]);

  if (coursesResult.error) {
    console.error("과정 일정 조회 오류:", coursesResult.error);
  }

  const courseSchedulesByGroupName = buildCourseScheduleMap(
    coursesResult.data ?? [],
  );

  const validGroupValues = new Set<string>(
    groupOptions.map((opt) => opt.value).filter(Boolean),
  );
  const initialGroupName =
    filterGroup && validGroupValues.has(filterGroup) ? filterGroup : "";

  const initialSuggestedTitle = initialGroupName
    ? buildSeatingChartDefaultTitle(
        initialGroupName,
        courseSchedulesByGroupName[initialGroupName],
      )
    : "";

  const listHref = filterGroup
    ? `/admin/seating?group=${encodeURIComponent(filterGroup)}`
    : "/admin/seating";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6">
      <SeatingChartForm
        initialGroupName={initialGroupName}
        initialSuggestedTitle={initialSuggestedTitle}
        courseSchedulesByGroupName={courseSchedulesByGroupName}
        listHref={listHref}
        groupOptions={groupOptions}
      />
    </div>
  );
}
