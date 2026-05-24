import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import ConsultationTab from "@/app/_components/ConsultationTab";

import AdminSubNav from "../_components/AdminSubNav";
import GroupTabsLoader from "../_components/GroupTabsLoader";

// 동적 렌더링 강제 (세션/그룹별로 다른 데이터를 매 요청마다 새로 조회)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "학생 상담 관리",
  description: "학생별 상담일지 작성과 답변 관리를 한곳에서 처리합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 학생 상담 관리 페이지
 * - /admin 패널 내부에서 학생 상담 기능을 제공
 * - 그룹(기수) 탭으로 학생 범위 필터링
 */
export default async function AdminConsultationsPage({
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

  // 1) 사용자 + 관리자 권한 확인
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

  // 2) 그룹별 학생 수 집계 (GroupTabs 배지용, 관리자 제외)
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("group_name")
    .neq("role", "admin");

  const profiles = allProfiles ?? [];
  const unsetGroupCount = profiles.filter((p) => !p.group_name).length;

  const studentCountsByGroup: Record<string, number> = {
    all: profiles.length,
  };
  for (const profile of profiles) {
    const groupKey = profile.group_name;
    if (groupKey) {
      studentCountsByGroup[groupKey] =
        (studentCountsByGroup[groupKey] ?? 0) + 1;
    }
  }
  // 각 기수 카운트에 그룹 미지정 인원 합산 (실제 표시 인원과 일치)
  for (const key of Object.keys(studentCountsByGroup)) {
    if (key !== "all") {
      studentCountsByGroup[key] += unsetGroupCount;
    }
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
            학생 상담 관리
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            학생을 선택해 상담일지를 작성하거나 기존 상담 내역을 확인합니다.{" "}
            <span className="text-zinc-400 dark:text-zinc-500">
              · 그룹 미지정 회원은 전체·기수 탭에서 함께 표시됩니다. 관리자
              계정은 대시보드에서 확인하세요.
            </span>
          </p>
        </div>

        {/* 관리자 패널 내 페이지 전환 */}
        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        {/* 기수(그룹) 필터 탭 */}
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
          </Suspense>
        </div>

        {/* 학생 상담 본문 (기존 컴포넌트 재사용) */}
        <ConsultationTab selectedGroup={filterGroup} />
      </main>
    </div>
  );
}
