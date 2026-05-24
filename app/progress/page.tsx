import { Suspense } from "react";
import ProgressGrid from "@/app/_components/ProgressGrid";
import GroupSelector from "@/app/_components/GroupSelector";
import { createClient } from "@/lib/supabase/server";
import { fetchProgressGridData } from "@/lib/fetch-progress-grid-data";
import { fetchGroupOptions } from "@/lib/fetch-group-options";

// 세션별로 다른 데이터를 보여주므로 캐싱 방지
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const adminSelectedGroup = (params?.group as string) || null;

  const supabase = await createClient();

  // 현재 로그인한 사용자 정보
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id || "";

  // 비로그인 사용자는 랜딩 페이지로 리다이렉트
  if (!currentUserId) {
    const { redirect } = await import("next/navigation");
    redirect("/");
  }

  // 현재 사용자의 프로필(role, group_name) 조회
  let isAdmin = false;
  let userGroupName: string | null = null;
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role, group_name")
    .eq("id", currentUserId)
    .single();
  isAdmin = currentUserProfile?.role === "admin";
  userGroupName = currentUserProfile?.group_name?.trim() || null;

  // 일반 사용자에게 group_name이 없으면 프로필 설정 유도
  if (!isAdmin && !userGroupName) {
    const { redirect } = await import("next/navigation");
    redirect("/profile?group_required=1");
  }

  // 진행과정 필터 그룹: 관리자는 URL 파라미터, 일반 사용자는 본인 과정
  const progressFilterGroup = isAdmin
    ? adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : null
    : userGroupName;

  const { assignments, users, progressData } = await fetchProgressGridData(
    supabase,
    {
      filterGroup: progressFilterGroup,
      currentUserId,
    },
  );

  const adminGroupOptions = isAdmin
    ? await fetchGroupOptions(supabase)
    : undefined;

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 sm:items-start">
        {/* 관리자용 과정 필터 */}
        {isAdmin && (
          <Suspense fallback={null}>
            <GroupSelector
              selectedGroup={adminSelectedGroup}
              groupOptions={adminGroupOptions}
            />
          </Suspense>
        )}

        <div className="w-full space-y-4 sm:space-y-6">
          {/* 일반 사용자 안내 메시지 */}
          {!isAdmin && userGroupName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-black dark:text-zinc-50">
                {userGroupName}
              </span>{" "}
              과정의 진행 현황만 표시됩니다.
            </p>
          )}

          {/* 진행과정 그리드 */}
          <Suspense
            fallback={<div className="text-center py-12">로딩 중...</div>}
          >
            <div className="w-full overflow-auto max-h-[calc(100vh-220px)] rounded-lg">
              <ProgressGrid
                currentUserId={currentUserId}
                assignments={assignments}
                users={users}
                progressData={progressData}
              />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
