import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  toTrainingCourseListItem,
  type TrainingCourseRecord,
} from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../_components/AdminSubNav";
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

  const [coursesResult, profilesResult] = await Promise.all([
    supabase
      .from("training_courses")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("group_name").neq("role", "admin"),
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

  const courses = (coursesResult.data ?? []).map((record) =>
    toTrainingCourseListItem(
      record as TrainingCourseRecord,
      studentCountByCourseName[(record as TrainingCourseRecord).name] ?? 0,
    ),
  );

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 flex items-center gap-2">
                <BookOpen className="size-7 shrink-0" />
                과정 관리
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                교육 과정을 등록하면 숙제·설문·학생 프로필 필터에 반영됩니다.
              </p>
            </div>
            <Link href="/admin/courses/new">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                <PencilLine className="size-4" />
                새 과정 등록
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <CourseList courses={courses} newCourseHref="/admin/courses/new" />
      </main>
    </div>
  );
}
