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

  const [snapshotsResult, profilesResult, students, honorBadgeSections] =
    await Promise.all([
      buildSnapshotsQuery(),
      supabase
        .from("profiles")
        .select("group_name")
        .neq("role", "admin")
        .eq("is_dormant", false),
      studentsPromise,
      honorBadgeSectionsPromise,
    ]);

  if (snapshotsResult.error) {
    console.error("반·조 게시판 목록 조회:", snapshotsResult.error);
  }

  const snapshots = (snapshotsResult.data ?? []).map((record) =>
    toClassRoleSnapshotListItem(record as ClassRoleSnapshotRecord),
  );

  const profiles = profilesResult.data ?? [];
  const unsetGroupCount = profiles.filter((p) => !p.group_name).length;

  const studentCountsByGroup: Record<string, number> = {
    all: profiles.length,
  };
  for (const profile of profiles) {
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
            <GroupTabsLoader
              selectedGroup={selectedGroupParam}
              studentCountsByGroup={studentCountsByGroup}
            />
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

        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          조 편성 게시판
        </h2>
        <ClassRoleSnapshotList
          snapshots={snapshots}
          newSnapshotHref={newSnapshotHref}
          groupQuery={groupQuery}
        />
    </>
  );
}
