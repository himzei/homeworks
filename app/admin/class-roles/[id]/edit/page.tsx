import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchClassRoleStudents } from "@/lib/class-officers";
import {
  toClassRoleSnapshotDetail,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import { extractCourseShortLabel } from "@/lib/courses";
import { buildCourseScheduleMap } from "@/lib/seating-chart-title";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../../_components/AdminSubNav";
import ClassRoleSnapshotForm from "../../../_components/ClassRoleSnapshotForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 관리자 - 반·조 게시판 글 수정
 */
export default async function AdminEditClassRolePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const selectedGroupParam = (queryParams?.group as string) || null;
  const filterGroup =
    selectedGroupParam && selectedGroupParam !== "all"
      ? selectedGroupParam
      : null;

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

  const { data: record, error } = await supabase
    .from("class_role_snapshots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !record) {
    notFound();
  }

  const snapshot = toClassRoleSnapshotDetail(
    record as ClassRoleSnapshotRecord,
  );

  const [students, coursesResult] = await Promise.all([
    fetchClassRoleStudents(supabase, snapshot.groupName),
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

  const groupForList = filterGroup ?? snapshot.groupName;
  const listHref = `/admin/class-roles?group=${encodeURIComponent(groupForList)}`;
  const detailHref = `/admin/class-roles/${id}?group=${encodeURIComponent(groupForList)}`;
  const cohortLabel = extractCourseShortLabel(snapshot.groupName);

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
                조 편성 수정
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {snapshot.title} · 드래그하여 조를 편성하세요.
              </p>
            </div>
            <Link href={detailHref}>
              <Button variant="outline">
                <ArrowLeft className="size-4" />
                상세
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="mt-6">
          <ClassRoleSnapshotForm
            groupName={snapshot.groupName}
            students={students}
            listHref={listHref}
            courseSchedulesByGroupName={courseSchedulesByGroupName}
            initialData={snapshot}
          />
        </div>
      </main>
    </div>
  );
}
