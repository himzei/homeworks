import { redirect } from "next/navigation";

import AdminMemberManagementList, {
  type AdminMemberListItem,
} from "@/app/admin/_components/AdminMemberManagementList";
import AdminMembersFilters from "@/app/admin/_components/AdminMembersFilters";
import AdminMembersPagination from "@/app/admin/_components/AdminMembersPagination";
import {
  buildMembersListQueryString,
  buildMembersSearchPattern,
  isUnsetMemberGroupName,
  MEMBERS_UNSET_GROUP,
  MEMBERS_UNSET_GROUP_OR_FILTER,
  parseMembersGroupFilter,
} from "@/lib/admin/members-list-query";
import { fetchGroupOptions } from "@/lib/fetch-group-options";
import { MEMBERS_LIST_PAGE_SIZE } from "@/lib/profile-members";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "회원 관리",
  description: "전체 회원 조회 및 승인·탈퇴(휴면) 처리",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type AdminMembersPageProps = {
  searchParams: Promise<{ page?: string; group?: string; q?: string }>;
};

/**
 * 관리자 — 전체 회원 관리 (페이지당 15명, 기수·검색 필터)
 */
export default async function AdminMembersPage({
  searchParams,
}: AdminMembersPageProps) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

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

  const selectedGroup = parseMembersGroupFilter(resolvedSearchParams.group);
  const searchQuery = (resolvedSearchParams.q ?? "").trim();

  const rawPage = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const currentPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rangeFrom = (currentPage - 1) * MEMBERS_LIST_PAGE_SIZE;
  const rangeTo = rangeFrom + MEMBERS_LIST_PAGE_SIZE - 1;

  const preservedQuery = buildMembersListQueryString({
    group: selectedGroup,
    q: searchQuery || null,
    page: currentPage > 1 ? currentPage : undefined,
  });

  const [groupOptions, countsResult, membersResult] = await Promise.all([
    fetchGroupOptions(supabase),
    supabase
      .from("profiles")
      .select("group_name")
      .neq("role", "admin"),
    (async () => {
      let query = supabase
        .from("profiles")
        .select(
          "id, name, group_name, phone, university, major, created_at, approval_status, is_dormant",
          { count: "exact" },
        )
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (selectedGroup === MEMBERS_UNSET_GROUP) {
        query = query.or(MEMBERS_UNSET_GROUP_OR_FILTER);
      } else if (selectedGroup) {
        query = query.eq("group_name", selectedGroup);
      }

      const searchPattern = buildMembersSearchPattern(searchQuery);
      if (searchPattern) {
        query = query.or(
          `name.ilike.${searchPattern},phone.ilike.${searchPattern}`,
        );
      }

      return query.range(rangeFrom, rangeTo);
    })(),
  ]);

  if (countsResult.error) {
    console.error("회원 수 집계 오류:", countsResult.error);
  }
  if (membersResult.error) {
    console.error("회원 목록 조회 오류:", membersResult.error);
  }

  const allProfilesForCount = countsResult.data ?? [];
  const memberCountsByGroup: Record<string, number> = {
    all: allProfilesForCount.length,
    [MEMBERS_UNSET_GROUP]: 0,
  };
  for (const profile of allProfilesForCount) {
    if (isUnsetMemberGroupName(profile.group_name)) {
      memberCountsByGroup[MEMBERS_UNSET_GROUP] += 1;
    } else {
      memberCountsByGroup[profile.group_name] =
        (memberCountsByGroup[profile.group_name] ?? 0) + 1;
    }
  }

  const { data: allMembers, count } = membersResult;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / MEMBERS_LIST_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  if (safePage !== currentPage && totalCount > 0) {
    redirect(
      `/admin/members${buildMembersListQueryString({
        group: selectedGroup,
        q: searchQuery || null,
        page: safePage > 1 ? safePage : undefined,
      })}`,
    );
  }

  const members: AdminMemberListItem[] = (allMembers ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() || "(이름 없음)",
    groupName: row.group_name,
    phone: row.phone,
    university: row.university?.trim() || null,
    major: row.major?.trim() || null,
    createdAtLabel: dateFormatter.format(new Date(row.created_at)),
    approvalStatus: row.approval_status,
    isDormant: row.is_dormant === true,
  }));

  const hasFilters = Boolean(selectedGroup || searchQuery);
  const emptyMessage = hasFilters
    ? "조건에 맞는 회원이 없습니다."
    : "등록된 회원이 없습니다.";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
          회원 관리
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          전체 회원을 확인하고 가입 승인·탈퇴(휴면)를 처리합니다. 기수별 필터와
          이름·연락처 검색을 사용할 수 있습니다. 페이지당{" "}
          {MEMBERS_LIST_PAGE_SIZE}명씩 표시합니다.
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          {hasFilters ? `검색 결과 ${totalCount}명` : `총 ${totalCount}명`}
          {totalPages > 1
            ? ` · ${safePage}/${totalPages} 페이지`
            : null}
        </p>
      </div>

      <AdminMembersFilters
        selectedGroup={selectedGroup}
        searchQuery={searchQuery}
        groupOptions={groupOptions}
        memberCountsByGroup={memberCountsByGroup}
      />

      <AdminMemberManagementList
        members={members}
        groupOptions={groupOptions}
        emptyMessage={emptyMessage}
      />

      <AdminMembersPagination
        currentPage={safePage}
        totalPages={totalPages}
        preservedQuery={preservedQuery}
      />
    </>
  );
}
