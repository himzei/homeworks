import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  toTrainingCourseDetail,
  type TrainingCourseRecord,
} from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

import CourseDetailArticle from "../../_components/CourseDetailArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("training_courses")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: data?.name ? `${data.name} · 과정 상세` : "과정 상세",
  };
}

/**
 * 관리자 - 과정 상세 (커리큘럼 + 캘린더)
 */
export default async function AdminCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: course, error } = await supabase
    .from("training_courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    notFound();
  }

  const record = course as TrainingCourseRecord;
  const detail = toTrainingCourseDetail(record);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {detail.description ? (
            <>
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                과정 설명
              </h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {detail.description}
              </p>
            </>
          ) : (
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {detail.name}
            </h2>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/admin/courses">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              목록
            </Button>
          </Link>
          <Link href={`/admin/courses/${id}/edit`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <PencilLine className="size-4" />
              수정
            </Button>
          </Link>
        </div>
      </div>
      <CourseDetailArticle course={detail} hideDescription />
    </div>
  );
}
