import { redirect } from "next/navigation";
import { Suspense } from "react";

import PeerEvaluationAdminPanel from "@/app/admin/_components/PeerEvaluationAdminPanel";
import GroupTabsLoader from "@/app/admin/_components/GroupTabsLoader";
import { fetchPeerEvaluationProjectsForAdmin } from "@/lib/peer-evaluation/fetch-projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "동료평가 관리",
  description: "기수별 동료평가 프로젝트를 생성하고 결과를 확인합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AdminPeerEvaluationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedGroupParam = (params?.group as string) || null;
  const isExplicitGroup =
    !!selectedGroupParam && selectedGroupParam !== "all";
  const filterGroup = isExplicitGroup ? selectedGroupParam : null;
  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : "";

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

  const projects = await fetchPeerEvaluationProjectsForAdmin(
    supabase,
    filterGroup,
  );

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader selectedGroup={selectedGroupParam} />
        </Suspense>
      </div>

      <PeerEvaluationAdminPanel
        projects={projects}
        selectedGroup={filterGroup}
        groupQuery={groupQuery}
      />
    </>
  );
}
