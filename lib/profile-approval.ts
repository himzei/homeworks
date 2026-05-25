/** 프로필 승인 상태 */
export const PROFILE_APPROVAL_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type ProfileApprovalStatus =
  (typeof PROFILE_APPROVAL_STATUS)[keyof typeof PROFILE_APPROVAL_STATUS];

export type ProfileWithApproval = {
  role?: string | null;
  approval_status?: string | null;
};

/** 관리자이거나 승인된 회원인지 */
export function isApprovedMember(profile: ProfileWithApproval | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.approval_status === PROFILE_APPROVAL_STATUS.approved;
}

export function getApprovalStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case PROFILE_APPROVAL_STATUS.approved:
      return "승인됨";
    case PROFILE_APPROVAL_STATUS.rejected:
      return "거절됨";
    case PROFILE_APPROVAL_STATUS.pending:
    default:
      return "승인 대기";
  }
}
