import Tabs from "@/app/_components/Tabs";
import ProgressGrid from "@/app/_components/ProgressGrid";
import TodayAssignments from "@/app/_components/TodayAssignments";
import SurveyTab from "@/app/_components/SurveyTab";
import GroupSelector from "@/app/_components/GroupSelector";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { fetchProgressGridData } from "@/lib/fetch-progress-grid-data";
import { fetchTodayAssignments } from "@/lib/fetch-today-assignments";

// 동적 렌더링 강제 설정 (세션별로 다른 데이터를 보여주므로 캐싱 방지)
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const adminSelectedGroup = (params?.group as string) || null;
  // Supabase 클라이언트 생성
  const supabase = await createClient();

  // 현재 로그인한 사용자 정보 먼저 가져오기 (group_name 필터링에 필요)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id || "";

  // 현재 사용자의 프로필 정보 (role, group_name)
  let isAdmin = false;
  let userGroupName: string | null = null;
  if (currentUserId) {
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("role, group_name")
      .eq("id", currentUserId)
      .single();
    isAdmin = currentUserProfile?.role === "admin";
    userGroupName = currentUserProfile?.group_name?.trim() || null;
  }

  // group_name이 없고 관리자가 아닌 일반 사용자 → 프로필 설정 유도
  if (!isAdmin && currentUserId && !userGroupName) {
    const { redirect } = await import("next/navigation");
    redirect("/profile?group_required=1");
  }

  // 필터에 사용할 그룹: 관리자는 URL 파라미터, 일반 사용자는 프로필
  const filterGroup =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : !isAdmin
        ? userGroupName
        : null;

  const todayAssignmentsData = await fetchTodayAssignments(supabase, {
    adminSelectedGroup,
  });

  // 진행과정: 일반 사용자는 본인 과정만, 관리자는 선택한 과정(또는 전체)
  const progressFilterGroup = isAdmin ? filterGroup : userGroupName;
  const { assignments, users, progressData } = await fetchProgressGridData(
    supabase,
    {
      filterGroup: progressFilterGroup,
      currentUserId,
    },
  );

  // 탭 아이템 정의
  const tabItems = [
    {
      id: "homework",
      label: "오늘의숙제",
      content: (
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
              오늘의 과제
            </h2>
            <p className="text-base sm:text-lg leading-7 sm:leading-8 text-zinc-600 dark:text-zinc-400">
              현재 진행 중인 과제입니다.
            </p>
          </div>

          {/* 오늘의 숙제 목록 */}
          <TodayAssignments assignments={todayAssignmentsData} />
        </div>
      ),
    },
    {
      id: "progress",
      label: "진행과정",
      content: (
        <div className="space-y-3 sm:space-y-4">
          {!isAdmin && userGroupName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-black dark:text-zinc-50">
                {userGroupName}
              </span>
              {" "}과정의 진행 현황만 표시됩니다.
            </p>
          )}
          <div className="w-full overflow-auto max-h-[calc(100vh-220px)] rounded-lg">
            <ProgressGrid
              currentUserId={currentUserId}
              assignments={assignments}
              users={users}
              progressData={progressData}
            />
          </div>
        </div>
      ),
    },
    {
      id: "survey",
      label: "설문조사",
      // viewMode="student"를 명시 — 관리자가 /home 에 접근해도 응답 UI만 표시
      content: <SurveyTab selectedGroup={filterGroup} viewMode="student" />,
    },
    // 관리자 전용 화면(숙제 리스트 / 평가 / 학생 상담)은 모두 /admin 패널로 이동
    // 사다리게임은 별도 페이지(/ladder)로 이동
  ];

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 bg-white dark:bg-black sm:items-start">
        {/* 관리자용 과정 필터 */}
        {isAdmin && (
          <Suspense fallback={null}>
            <GroupSelector selectedGroup={adminSelectedGroup} />
          </Suspense>
        )}
        <Suspense
          fallback={<div className="text-center py-12">로딩 중...</div>}
        >
          <Tabs items={tabItems} defaultTabId="homework" />
        </Suspense>
      </div>
    </div>
  );
}
