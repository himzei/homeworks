import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import SurveyTab from "@/app/_components/SurveyTab";

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

  return (
    <>
        {/* 기수(그룹) 필터 탭 */}
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader selectedGroup={selectedGroupParam} />
          </Suspense>
        </div>

        {/* 설문조사 본문: viewMode="admin"을 명시 — 관리자 UI(생성/삭제/응답수)만 표시 */}
        <SurveyTab selectedGroup={filterGroup} viewMode="admin" />
    </>
  );
}
