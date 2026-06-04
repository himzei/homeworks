/** 첨부파일 미리보기 종류 */
export type TeamAttachmentPreviewKind = "image" | "pdf" | "other";

/** 파일명으로 미리보기 가능 여부 판별 */
export function getTeamAttachmentPreviewKind(
  fileName: string,
): TeamAttachmentPreviewKind {
  const lower = fileName.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp)$/.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}

export function canPreviewTeamAttachment(fileName: string): boolean {
  return getTeamAttachmentPreviewKind(fileName) !== "other";
}

type SignedUrlResponse = {
  signedUrl?: string;
  fileName?: string;
  error?: string;
};

/** 관리자 API — 첨부파일 signed URL 조회 */
export async function fetchAdminTeamAttachmentSignedUrl(
  snapshotId: string,
  teamNumber: number,
): Promise<{ signedUrl: string; fileName: string } | { error: string }> {
  const response = await fetch(
    `/api/admin/class-role-snapshots/${snapshotId}/team-project?teamNumber=${teamNumber}`,
  );
  const payload = (await response.json()) as SignedUrlResponse;

  if (!response.ok || !payload.signedUrl) {
    return { error: payload.error ?? "첨부파일을 불러오지 못했습니다." };
  }

  return {
    signedUrl: payload.signedUrl,
    fileName: payload.fileName ?? "attachment",
  };
}

/** Blob을 로컬 파일로 다운로드 */
export function downloadBlobAsFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** signed URL에서 파일 다운로드 */
export async function downloadFileFromSignedUrl(
  signedUrl: string,
  fileName: string,
): Promise<string | null> {
  const fileResponse = await fetch(signedUrl);
  if (!fileResponse.ok) {
    return "첨부파일 다운로드에 실패했습니다.";
  }

  const blob = await fileResponse.blob();
  downloadBlobAsFile(blob, fileName);
  return null;
}

/** 관리자 API — 첨부파일 다운로드 */
export async function downloadAdminTeamAttachment(
  snapshotId: string,
  teamNumber: number,
  fallbackFileName?: string | null,
): Promise<string | null> {
  const result = await fetchAdminTeamAttachmentSignedUrl(snapshotId, teamNumber);
  if ("error" in result) {
    return result.error;
  }

  return downloadFileFromSignedUrl(
    result.signedUrl,
    result.fileName ?? fallbackFileName ?? "attachment",
  );
}
