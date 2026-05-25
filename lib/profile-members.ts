/** 관리자 회원 목록 페이지당 표시 수 */
export const MEMBERS_LIST_PAGE_SIZE = 15;

/** 휴면(탈퇴) 회원 — 과정 미분류, 일반 화면에서 숨김 */
export function isDormantMember(
  profile: { is_dormant?: boolean | null } | null | undefined,
): boolean {
  return profile?.is_dormant === true;
}

export function getMemberActivityLabel(isDormant: boolean | null | undefined): string {
  return isDormant ? "휴면" : "활성";
}
