import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchClassRoleStudents } from "@/lib/class-officers";
import { buildClassRoleDefaultTitle } from "@/lib/class-role-snapshots";
import { buildCourseScheduleMap } from "@/lib/seating-chart-title";

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

  return (
    <ClassRoleSnapshotForm
      groupName={filterGroup}
      students={students}
      listHref={listHref}
      courseSchedulesByGroupName={courseSchedulesByGroupName}
      initialSuggestedTitle={initialSuggestedTitle}
    />
  );
}
