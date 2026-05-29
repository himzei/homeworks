/** refresh token 만료 등 확정적 세션 종료 여부 (일반 401·네트워크 오류는 제외) */
export function isSessionExpiredError(error: unknown): boolean {
  if (!error) return false;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: string }).message ?? "")
          : "";

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;

  if (
    message.includes("Invalid Refresh Token") ||
    message.includes("Refresh Token Not Found") ||
    message.includes("refresh_token") ||
    message.includes("Refresh Token")
  ) {
    return true;
  }

  // JWT 만료 등 명시적 인증 실패만 처리 (일반 401은 네트워크/일시 오류일 수 있음)
  if (
    status === 401 &&
    (message.includes("JWT") ||
      message.includes("expired") ||
      message.includes("invalid claim"))
  ) {
    return true;
  }

  return false;
}
