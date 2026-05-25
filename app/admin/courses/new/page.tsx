import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6">
      <CourseForm />
    </div>
  );
}
