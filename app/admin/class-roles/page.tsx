import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { fetchClassRoleStudents } from "@/lib/class-officers";
import { fetchHonorBadgeSectionsForGroup } from "@/lib/honor-badges";
import {
  toClassRoleSnapshotListItem,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import ClassPresidentPanel from "../_components/ClassPresidentPanel";
import HonorBadgeSectionsManager from "../_components/HonorBadgeSectionsManager";
import ClassRoleSnapshotList from "../_components/ClassRoleSnapshotList";
import GroupTabsLoader from "../_components/GroupTabsLoader";
import { Button } from "@/app/_components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "반·조 관리",
  description:
    "반장은 목록에서, 조장·조원은 게시판 글로 과정별 반·조를 관리합니다.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * 관리자 - 반·조 관리 게시판 목록
 */
export default async function AdminClassRolesPage({
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

  const buildSnapshotsQuery = () => {
    const query = supabase
      .from("class_role_snapshots")
      .select("*")
      .order("created_at", { ascending: false });

    if (!filterGroup) return query;
    return query.eq("group_name", filterGroup);
  };

  const studentsPromise = filterGroup
    ? fetchClassRoleStudents(supabase, filterGroup)
    : Promise.resolve([]);

  const honorBadgeSectionsPromise = filterGroup
    ? fetchHonorBadgeSectionsForGroup(supabase, filterGroup)
    : Promise.resolve([]);

  const [snapshotsResult, students, honorBadgeSections] = await Promise.all([
    buildSnapshotsQuery(),
    studentsPromise,
    honorBadgeSectionsPromise,
  ]);

  if (snapshotsResult.error) {
    console.error("반·조 게시판 목록 조회:", snapshotsResult.error);
  }

  const snapshots = (snapshotsResult.data ?? []).map((record) =>
    toClassRoleSnapshotListItem(record as ClassRoleSnapshotRecord),
  );

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : "";

  const newSnapshotHref = filterGroup
    ? `/admin/class-roles/new?group=${encodeURIComponent(filterGroup)}`
    : "/admin/class-roles/new";

  return (
    <>
        <div className="mb-6 sm:mb-8">
          <Suspense fallback={null}>
            <GroupTabsLoader selectedGroup={selectedGroupParam} />
          </Suspense>
        </div>

        {!filterGroup ? (
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            반·조 편성은 <strong>기수(과정)</strong> 탭을 선택한 뒤 이용해
            주세요.
          </p>
        ) : (
          <>
            <ClassPresidentPanel groupName={filterGroup} students={students} />
            <HonorBadgeSectionsManager
              groupName={filterGroup}
              students={students}
              initialSections={honorBadgeSections}
            />
          </>
        )}

        {/* 한글 주석: 조 편성 게시판은 접기 없이 항상 표시 */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              조 편성 게시판
            </h2>
            <Button
              asChild
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
            >
              <Link href={newSnapshotHref}>글쓰기</Link>
            </Button>
          </div>
          <ClassRoleSnapshotList
            snapshots={snapshots}
            newSnapshotHref={newSnapshotHref}
            groupQuery={groupQuery}
          />
        </section>
    </>
  );
}
