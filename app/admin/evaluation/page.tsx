import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { LEGACY_GROUPS } from "@/lib/constants";
import EvaluationTab from "@/app/_components/EvaluationTab";

import GroupTabsLoader from "../_components/GroupTabsLoader";

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

  const courseScheduleQuery = filterGroup
    ? supabase
        .from("training_courses")
        .select("main_education_start_date")
        .eq("name", filterGroup)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [assignmentsResult, courseScheduleResult] = await Promise.all([
    buildAssignmentsQuery(),
    courseScheduleQuery,
  ]);

  if (courseScheduleResult.error) {
    console.error("본교육 시작일 조회 오류:", courseScheduleResult.error);
  }

  const mainEducationStartDate =
    courseScheduleResult.data?.main_education_start_date ?? null;

  const assignments = assignmentsResult.data ?? [];

  // EvaluationTab에 전달할 과제 목록 형식 변환
  const evaluationAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    content: assignment.content ?? "",
    startDate: new Date(assignment.start_date),
    endDate: new Date(assignment.end_date),
  }));

  return (
    <>
        {/* 기수(그룹) 필터 탭 */}
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader selectedGroup={selectedGroupParam} />
          </Suspense>
        </div>

        {/* 평가 본문 (기존 클라이언트 컴포넌트 재사용) */}
        <EvaluationTab
          assignments={evaluationAssignments}
          selectedGroup={filterGroup}
          mainEducationStartDate={mainEducationStartDate}
        />
    </>
  );
}
