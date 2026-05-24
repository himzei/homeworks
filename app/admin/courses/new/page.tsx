import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../_components/AdminSubNav";
import CourseForm from "../../_components/CourseForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "새 과정 등록",
  description: "관리자 패널에서 새 교육 과정을 등록합니다.",
};

/**
 * 관리자 - 새 과정 등록 페이지
 */
export default async function AdminNewCoursePage() {
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

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                새 과정 등록
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                과정명은 숙제·설문·학생 프로필에서 공통으로 사용됩니다.
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
          <CourseForm />
        </div>
      </main>
    </div>
  );
}
