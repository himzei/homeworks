import { redirect } from "next/navigation";
import { Suspense } from "react";

import CompanyInquiryAggregatePanel from "@/app/admin/_components/CompanyInquiryAggregatePanel";
import GroupTabsLoader from "@/app/admin/_components/GroupTabsLoader";
import { fetchCompanyInquiryPostsForAdmin } from "@/lib/company-inquiry/fetch-company-inquiry-posts-for-admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "기업(문의) 취합",
  description: "회원이 남긴 기업(문의) 포스트잇을 관리자가 한곳에서 취합·다운로드합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 기업(문의) 취합 페이지
 */
export default async function AdminCompanyInquiriesPage({
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

  const allPosts = await fetchCompanyInquiryPostsForAdmin(supabase);

  // 과정 탭 배지용 글 수 집계
  const postCountsByGroup: Record<string, number> = {
    all: allPosts.length,
  };
  for (const post of allPosts) {
    if (!post.authorGroupName) continue;
    postCountsByGroup[post.authorGroupName] =
      (postCountsByGroup[post.authorGroupName] ?? 0) + 1;
  }

  const filteredPosts = filterGroup
    ? allPosts.filter((post) => post.authorGroupName === filterGroup)
    : allPosts;

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader
            selectedGroup={selectedGroupParam}
            studentCountsByGroup={postCountsByGroup}
          />
        </Suspense>
      </div>

      <CompanyInquiryAggregatePanel
        posts={filteredPosts}
        totalPostCount={allPosts.length}
        selectedGroup={filterGroup}
      />
    </>
  );
}
