import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchClassRoleStudents } from "@/lib/class-officers";
import { extractCourseShortLabel } from "@/lib/courses";
import { buildClassRoleDefaultTitle } from "@/lib/class-role-snapshots";
import {
  buildCourseScheduleMap,
} from "@/lib/seating-chart-title";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../_components/AdminSubNav";
import ClassRoleSnapshotForm from "../../_components/ClassRoleSnapshotForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "조 편성 글쓰기",
  description: "과정별 조장·조원을 새 글로 등록합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 반·조 게시판 글쓰기
 */
export default async function AdminNewClassRolePage({
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

  if (!filterGroup) {
    redirect("/admin/class-roles");
  }

  const [students, coursesResult] = await Promise.all([
    fetchClassRoleStudents(supabase, filterGroup),
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

  const initialSuggestedTitle = buildClassRoleDefaultTitle(
    filterGroup,
    courseSchedulesByGroupName[filterGroup],
  );

  const listHref = `/admin/class-roles?group=${encodeURIComponent(filterGroup)}`;
  const cohortLabel = extractCourseShortLabel(filterGroup);

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-base font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  {cohortLabel}
                </span>
                조 편성 글쓰기
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {filterGroup} · 드래그하여 조장·조원을 배치하고 제목을 붙여
                저장하세요.
              </p>
            </div>
            <Link href={listHref}>
              <Button variant="outline">
                <ArrowLeft className="size-4" />
                목록
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="mt-6">
          <ClassRoleSnapshotForm
            groupName={filterGroup}
            students={students}
            listHref={listHref}
            courseSchedulesByGroupName={courseSchedulesByGroupName}
            initialSuggestedTitle={initialSuggestedTitle}
          />
        </div>
      </main>
    </div>
  );
}
