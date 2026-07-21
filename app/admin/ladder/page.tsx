import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import GroupTabsLoader from "../_components/GroupTabsLoader";
import LadderExclusionRulesPanel from "../_components/LadderExclusionRulesPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "사다리 금지 규칙",
  description: "기수별 사다리게임 같은 결과 금지 규칙을 관리합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 — 사다리 기수 공통 같은 결과 금지 규칙
 */
export default async function AdminLadderPage({
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

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <Suspense fallback={null}>
          <GroupTabsLoader selectedGroup={selectedGroupParam} />
        </Suspense>
      </div>

      <LadderExclusionRulesPanel selectedGroup={filterGroup} />
    </>
  );
}
