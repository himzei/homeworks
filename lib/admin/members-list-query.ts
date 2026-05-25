/** URL·쿼리용 — 과정 미분류(group_name null) */
export const MEMBERS_UNSET_GROUP = "__unset__";

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
