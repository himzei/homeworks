/** 관리자 숙제 리스트 기본 경로 */
export const ADMIN_ASSIGNMENTS_PATH = "/admin/assignments";

type BuildAdminAssignmentsListPathOptions = {
  /** 선택된 기수(그룹) 필터 */
  filterGroup?: string | null;
  /** 강조·페이지 이동 대상 과제 ID */
  focusAssignmentId?: string | null;
};

/** group·assignment 쿼리를 유지한 숙제 리스트 URL */
export function buildAdminAssignmentsListPath(
  options: BuildAdminAssignmentsListPathOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.filterGroup) {
    params.set("group", options.filterGroup);
  }
  if (options.focusAssignmentId) {
    params.set("assignment", options.focusAssignmentId);
  }
  const queryString = params.toString();
  return queryString
    ? `${ADMIN_ASSIGNMENTS_PATH}?${queryString}`
    : ADMIN_ASSIGNMENTS_PATH;
}

/** 편집 페이지 returnTo 검증 (오픈 리다이렉트 방지) */
export function getSafeAdminAssignmentsReturnPath(
  returnTo: string | null | undefined,
): string | null {
  if (!returnTo) return null;
  if (!returnTo.startsWith(ADMIN_ASSIGNMENTS_PATH)) return null;
  // 절대 URL·프로토콜 우회 차단
  if (returnTo.includes("://") || returnTo.startsWith("//")) return null;
  return returnTo;
}

/** 숙제 수정 링크 (완료 후 돌아갈 목록 경로 포함) */
export function buildAssignmentEditHref(
  assignmentId: string,
  returnPath: string,
): string {
  const params = new URLSearchParams({ returnTo: returnPath });
  return `/assignment/edit/${assignmentId}?${params.toString()}`;
}
