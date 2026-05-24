import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  courseRecordToFormValues,
  type TrainingCourseRecord,
} from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../../_components/AdminSubNav";
import CourseForm from "../../../_components/CourseForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "과정 수정",
  description: "교육 과정 일정·커리큘럼·휴일 설정을 수정합니다.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 관리자 - 과정 수정 페이지
 */
export default async function AdminCourseEditPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: course, error } = await supabase
    .from("training_courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    notFound();
  }

  const record = course as TrainingCourseRecord;
  const initialValues = courseRecordToFormValues(record);

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                과정 수정
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {record.name}
              </p>
            </div>
            <Link href="/admin/courses">
              <Button variant="outline">
                <ArrowLeft className="size-4" />
                과정 목록
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6">
          <CourseForm courseId={id} initialValues={initialValues} />
        </div>
      </main>
    </div>
  );
}
