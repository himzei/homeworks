import { Suspense } from "react";
import SurveyTab from "@/app/_components/SurveyTab";
import GroupSelector from "@/app/_components/GroupSelector";
import { createClient } from "@/lib/supabase/server";

// 세션별로 다른 데이터를 보여주므로 캐싱 방지
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SurveyPage({
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

  // 비로그인 사용자는 홈으로 리다이렉트
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

  // 필터에 사용할 그룹: 관리자는 URL 파라미터, 일반 사용자는 프로필
  const filterGroup =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : !isAdmin
        ? userGroupName
        : null;

  return (
    <div className="flex min-h-full items-start justify-center">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 sm:items-start">
        {/* 관리자용 과정 필터 */}
        {isAdmin && (
          <Suspense fallback={null}>
            <GroupSelector selectedGroup={adminSelectedGroup} />
          </Suspense>
        )}

        <div className="w-full space-y-4 sm:space-y-6">
          {/* 페이지 헤더 */}

          {/* 일반 사용자 안내 메시지 */}
          {!isAdmin && userGroupName && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-black dark:text-zinc-50">
                {userGroupName}
              </span>{" "}
              과정의 설문조사입니다.
            </p>
          )}

          {/* 설문조사 본문 */}
          <Suspense
            fallback={<div className="text-center py-12">로딩 중...</div>}
          >
            {/* viewMode="student" — 관리자도 응답 UI를 보도록 설정 */}
            <SurveyTab selectedGroup={filterGroup} viewMode="student" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
