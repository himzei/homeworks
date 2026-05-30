import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  sortTrainingCourseRecordsByStartDateDesc,
  toTrainingCourseListItem,
  type TrainingCourseRecord,
} from "@/lib/courses";

import CourseList from "../_components/CourseList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "과정 관리",
  description: "교육 과정을 게시판 형식으로 등록·관리합니다.",
};

/**
 * 관리자 - 과정 관리 게시판
 */
export default async function AdminCoursesPage() {
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

  const [coursesResult, profilesResult] = await Promise.all([
    supabase.from("training_courses").select("*"),
    supabase
      .from("profiles")
      .select("group_name")
      .neq("role", "admin")
      .eq("is_dormant", false),
  ]);

  if (coursesResult.error) {
    console.error("과정 목록 조회 오류:", coursesResult.error);
  }

  const profiles = profilesResult.data ?? [];
  const studentCountByCourseName: Record<string, number> = {};
  for (const profile of profiles) {
    const groupName = profile.group_name?.trim();
    if (!groupName) continue;
    studentCountByCourseName[groupName] =
      (studentCountByCourseName[groupName] ?? 0) + 1;
  }

  const sortedCourseRecords = sortTrainingCourseRecordsByStartDateDesc(
    (coursesResult.data ?? []) as TrainingCourseRecord[],
  );

  const courses = sortedCourseRecords.map((record) =>
    toTrainingCourseListItem(
      record,
      studentCountByCourseName[record.name] ?? 0,
    ),
  );

  return <CourseList courses={courses} newCourseHref="/admin/courses/new" />;
}
