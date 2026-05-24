import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { buildAdminAssignmentsListPath } from "@/lib/admin/admin-assignments-path";
import { LEGACY_GROUPS } from "@/lib/constants";
import { Button } from "@/app/_components/ui/button";
import AssignmentList from "@/app/_components/AssignmentList";

import AdminSubNav from "../_components/AdminSubNav";
import GroupTabsLoader from "../_components/GroupTabsLoader";

// 동적 렌더링 강제 (그룹별/세션별 데이터를 매 요청마다 새로 조회)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "숙제 리스트 관리",
  description: "관리자 패널에서 과제 등록·관리 및 제출 현황 확인",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 숙제 리스트 관리 페이지
 * - 과제 등록(글쓰기) / 수정 / 제출 현황 확인
 * - 그룹(기수) 탭으로 과제 범위 필터링
 */
export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedGroupParam = (params?.group as string) || null;
  const isExplicitGroup =
    !!selectedGroupParam && selectedGroupParam !== "all";
  const filterGroup = isExplicitGroup ? selectedGroupParam : null;
  const focusAssignmentId =
    typeof params?.assignment === "string" ? params.assignment : null;

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

  // 2) 과제 조회 + 그룹별 학생 수 집계 (탭 배지용) 병렬 처리
  // assignments 쿼리 빌더 (home과 동일한 LEGACY 호환 로직)
  const buildAssignmentsQuery = () => {
    const query = supabase
      .from("assignments")
      .select("id, title, content, start_date, end_date, group_name")
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

  // 3) 그룹별 학생 수 집계 (탭 배지 표시용)
  // 일관성을 위해 다른 admin 페이지와 동일하게 미지정 인원을 각 기수에 합산
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

  // 4) 각 과제별 제출 학생 수 조회 (count만 가져와서 가볍게 처리)
  // Promise.all로 병렬 처리하여 N개 과제에 대한 waterfall 방지
  const assignmentListData = await Promise.all(
    assignments.map(async (assignment) => {
      const { count, error } = await supabase
        .from("homeworks")
        .select("*", { count: "exact", head: true })
        .eq("assignment_id", assignment.id);

      if (error) {
        console.error(`과제 ${assignment.id} 제출 수 조회 오류:`, error);
      }

      return {
        id: assignment.id,
        title: assignment.title,
        content: assignment.content ?? "",
        startDate: new Date(assignment.start_date),
        endDate: new Date(assignment.end_date),
        submissionCount: count ?? 0,
      };
    }),
  );

  // 5) 헤더 안내 문구
  const scopeDescription = filterGroup
    ? `${filterGroup} · 해당 과정과 공통 과제를 표시합니다.`
    : "모든 과정의 과제를 표시합니다.";

  const newAssignmentHref = filterGroup
    ? `/admin/assignments/new?group=${encodeURIComponent(filterGroup)}`
    : "/admin/assignments/new";

  // 수정 완료 후 돌아올 목록 URL (그룹·포커스 과제 유지)
  const assignmentsListPath = buildAdminAssignmentsListPath({
    filterGroup,
    focusAssignmentId,
  });

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        {/* 페이지 헤더 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                숙제 리스트
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {scopeDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={newAssignmentHref}>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Plus className="size-4" />새 과제 등록
                </Button>
              </Link>
            </div>
          </div>
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

        {/* 숙제 리스트 본문 (기존 컴포넌트 재사용) */}
        <AssignmentList
          assignments={assignmentListData}
          focusAssignmentId={focusAssignmentId}
          assignmentsListPath={assignmentsListPath}
        />
      </main>
    </div>
  );
}
