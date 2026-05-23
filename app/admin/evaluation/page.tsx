import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import EvaluationTab from "@/app/_components/EvaluationTab";

import AdminSubNav from "../_components/AdminSubNav";
import GroupTabs from "../_components/GroupTabs";

// 동적 렌더링 강제 (관리자 그룹 선택에 따라 매 요청마다 다른 데이터)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "제출물 평가",
  description: "관리자 패널에서 학생 제출물의 평가 상태를 관리합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 제출물 평가 페이지
 * - 그룹(기수) 탭으로 학생 범위를 필터링
 * - EvaluationTab 컴포넌트(클라이언트)에서 제출물 상태/URL을 표시·수정
 */
export default async function AdminEvaluationPage({
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

  // 2) assignments + profiles 병렬 조회
  // assignments 쿼리: LEGACY_GROUPS는 null + 해당 그룹 모두, 신규 기수는 해당 그룹만
  const buildAssignmentsQuery = () => {
    const query = supabase
      .from("assignments")
      .select("id, title, content, start_date, end_date")
      .order("created_at", { ascending: false });

    if (!filterGroup) return query;

    if (LEGACY_GROUPS.includes(filterGroup as (typeof LEGACY_GROUPS)[number])) {
      const escaped = filterGroup.replace(/"/g, '""');
      return query.or(`group_name.is.null,group_name.eq."${escaped}"`);
    }
    return query.eq("group_name", filterGroup);
  };

  const [assignmentsResult, profilesResult] = await Promise.all([
    buildAssignmentsQuery(),
    supabase.from("profiles").select("group_name"),
  ]);

  const assignments = assignmentsResult.data ?? [];
  const allProfiles = profilesResult.data ?? [];

  // 3) 그룹별 학생 수 집계 (탭 배지용) - 다른 admin 페이지와 동일 정책
  // (각 기수 카운트에 그룹 미지정 인원도 합산)
  const unsetGroupCount = allProfiles.filter((p) => !p.group_name).length;
  const studentCountsByGroup: Record<string, number> = {
    all: allProfiles.length,
  };
  for (const profile of allProfiles) {
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

  // 4) EvaluationTab에 전달할 과제 목록 형식 변환
  const evaluationAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    content: assignment.content ?? "",
    startDate: new Date(assignment.start_date),
    endDate: new Date(assignment.end_date),
  }));

  const scopeDescription = filterGroup
    ? `${filterGroup} · 해당 과정 학생들의 제출물을 표시합니다.`
    : "모든 과정 학생들의 제출물을 표시합니다.";

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
            제출물 평가
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
            <GroupTabs
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
          </Suspense>
        </div>

        {/* 평가 본문 (기존 클라이언트 컴포넌트 재사용) */}
        <EvaluationTab
          assignments={evaluationAssignments}
          selectedGroup={filterGroup}
        />
      </main>
    </div>
  );
}
