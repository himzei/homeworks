/** URL·쿼리용 — 과정 미분류(group_name null·빈 문자열) */
export const MEMBERS_UNSET_GROUP = "__unset__";

/** Supabase `.or()` — group_name이 null 또는 빈 문자열인 회원 */
export const MEMBERS_UNSET_GROUP_OR_FILTER =
  'group_name.is.null,group_name.eq.';

/** 과정 미분류 여부 (집계·표시·필터에서 동일 규칙 사용) */
export function isUnsetMemberGroupName(
  groupName: string | null | undefined,
): boolean {
  return !groupName?.trim();
}

/** 과정명 정규화 — 빈 문자열은 null(미분류)로 통일 */
export function normalizeMemberGroupName(
  groupName: string | null | undefined,
): string | null {
  const trimmedGroupName = groupName?.trim();
  return trimmedGroupName ? trimmedGroupName : null;
}

export type MembersListSearchParams = {
  page?: string;
  group?: string;
  q?: string;
};

/** 회원 목록 URL 쿼리 문자열 생성 (? 포함) */
export function buildMembersListQueryString(
  params: {
    page?: number;
    group?: string | null;
    q?: string | null;
  },
): string {
  const search = new URLSearchParams();

  if (params.group) {
    search.set("group", params.group);
  }
  const trimmedQuery = params.q?.trim();
  if (trimmedQuery) {
    search.set("q", trimmedQuery);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

/** 선택된 기수 필터 값 (없으면 전체) */
export function parseMembersGroupFilter(
  groupParam: string | undefined,
): string | null {
  if (!groupParam || groupParam === "all") return null;
  return groupParam;
}

/** 검색어 ilike 패턴 (이름·연락처) */
export function buildMembersSearchPattern(searchQuery: string): string | null {
  const searchTerm = searchQuery.trim();
  if (!searchTerm) return null;
  const escaped = searchTerm.replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}
