import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import SurveyTab from "@/app/_components/SurveyTab";

import AdminSubNav from "../_components/AdminSubNav";
import GroupTabsLoader from "../_components/GroupTabsLoader";

// 동적 렌더링 강제 (그룹 선택에 따라 매 요청 다른 데이터)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "설문조사 관리",
  description: "관리자 패널에서 설문 생성·게시·응답 확인을 진행합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 설문조사 관리 페이지
 * - 설문 생성 / 응답 통계 확인 등은 SurveyTab(클라이언트)에서 isAdmin 분기로 처리
 * - 학생용 설문 응답 화면은 /home 의 "설문조사" 탭에 그대로 유지
 */
export default async function AdminSurveysPage({
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

  // 2) 그룹별 학생 수 집계 (탭 배지용)
  // 다른 admin 페이지와 동일한 정책으로 미지정 인원은 각 기수에 합산
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("group_name");

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
  for (const key of Object.keys(studentCountsByGroup)) {
    if (key !== "all") {
      studentCountsByGroup[key] += unsetGroupCount;
    }
  }

  const scopeDescription = filterGroup
    ? `${filterGroup} · 해당 과정의 설문과 공통 설문을 표시합니다.`
    : "모든 과정의 설문조사를 표시합니다.";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
            설문조사 관리
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {scopeDescription}
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

        {/* 설문조사 본문: viewMode="admin"을 명시 — 관리자 UI(생성/삭제/응답수)만 표시 */}
        <SurveyTab selectedGroup={filterGroup} viewMode="admin" />
      </main>
    </div>
  );
}
