import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { GROUP_OPTIONS } from "@/lib/constants";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../_components/AdminSubNav";
import NewAssignmentForm from "../../_components/NewAssignmentForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "새 과제 등록",
  description: "관리자 패널에서 새 숙제를 작성합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 새 과제 작성 페이지
 */
export default async function AdminNewAssignmentPage({
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

  // 탭에서 선택한 과정이 유효하면 대상 과정 기본값으로 사용
  const validGroupValues = new Set<string>(
    GROUP_OPTIONS.map((opt) => opt.value).filter(Boolean),
  );
  const initialGroupName =
    filterGroup && validGroupValues.has(filterGroup) ? filterGroup : "";

  const listHref = filterGroup
    ? `/admin/assignments?group=${encodeURIComponent(filterGroup)}`
    : "/admin/assignments";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                새 과제 등록
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                관리자 패널에서 숙제를 작성합니다.
              </p>
            </div>
            <Link href={listHref}>
              <Button variant="outline">
                <ArrowLeft className="size-4" />
                숙제 리스트
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">로딩 중...</p>}>
            <NewAssignmentForm initialGroupName={initialGroupName} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
