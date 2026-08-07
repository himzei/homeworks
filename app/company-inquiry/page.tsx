import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import GroupSelector from "@/app/_components/GroupSelector";
import CompanyInquiryStickyBoard from "@/app/company-inquiry/sticky-board/CompanyInquiryStickyBoard";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { fetchGroupOptions } from "@/lib/fetch-group-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "기업(문의)",
  description: "기업/기관 문의를 포스트잇 게시판에 남길 수 있는 페이지입니다.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CompanyInquiryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const adminSelectedGroup = (params?.group as string) || null;

  const supabase = await createClient();
  const { user, profile } = await requireApprovedMember(supabase);
  const isAdmin = profile.role === "admin";
  const userGroupName = profile.group_name?.trim() || null;

  // 일반 회원은 기수가 있어야 본인 기수 게시판을 볼 수 있음
  if (!isAdmin && !userGroupName) {
    redirect("/profile?group_required=1");
  }

  // 관리자: URL 과정 필터 / 회원: 본인 기수 고정
  const filterGroup =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : !isAdmin
        ? userGroupName
        : null;

  // 작성 시 넣을 기수: 관리자는 선택한 과정, 회원은 본인 기수
  const writeGroupName =
    isAdmin && adminSelectedGroup && adminSelectedGroup !== "all"
      ? adminSelectedGroup
      : userGroupName;

  let postsQuery = supabase
    .from("company_inquiry_posts")
    .select(
      "id, author_id, author_name, is_anonymous, content, note_color, rotate_deg, created_at, group_name",
    )
    .order("created_at", { ascending: false });

  // 특정 기수만 볼 때는 최근 60개, 전체(기수별 분리)는 더 넓게 조회
  postsQuery = postsQuery.limit(filterGroup ? 60 : 300);

  if (filterGroup) {
    postsQuery = postsQuery.eq("group_name", filterGroup);
  }

  const { data: initialPosts, error } = await postsQuery;

  if (error) {
    console.error("기업(문의) 게시글 조회 오류:", error);
  }

  const adminGroupOptions = isAdmin
    ? await fetchGroupOptions(supabase)
    : undefined;

  return (
    <>
      {isAdmin ? (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Suspense fallback={null}>
            <GroupSelector
              selectedGroup={adminSelectedGroup}
              groupOptions={adminGroupOptions}
            />
          </Suspense>
        </div>
      ) : null}

      <CompanyInquiryStickyBoard
        key={filterGroup ?? "all"}
        initialPosts={initialPosts ?? []}
        currentUserId={user.id}
        currentUserName={profile.name ?? "사용자"}
        writeGroupName={writeGroupName}
        cohortLabel={filterGroup}
        isAdmin={isAdmin}
      />
    </>
  );
}
