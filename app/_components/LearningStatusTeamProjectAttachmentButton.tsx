"use client";

import { useState } from "react";
import { Download, Loader2, Paperclip } from "lucide-react";

type LearningStatusTeamProjectAttachmentButtonProps = {
  snapshotId: string;
  teamNumber: number;
  fileName: string | null;
};

/** 학습현황 — 팀 프로젝트 첨부파일 다운로드 */
export default function LearningStatusTeamProjectAttachmentButton({
  snapshotId,
  teamNumber,
  fileName,
}: LearningStatusTeamProjectAttachmentButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/learning-status/team-project-attachment?snapshotId=${encodeURIComponent(snapshotId)}&teamNumber=${teamNumber}`,
      );
      const payload = (await response.json()) as {
        signedUrl?: string;
        fileName?: string;
        error?: string;
      };

      if (!response.ok || !payload.signedUrl) {
        window.alert(payload.error ?? "첨부파일을 불러오지 못했습니다.");
        return;
      }

      const downloadName = payload.fileName ?? fileName ?? "attachment";
      const fileResponse = await fetch(payload.signedUrl);
      if (!fileResponse.ok) {
        window.alert("첨부파일 다운로드에 실패했습니다.");
        return;
      }

      const blob = await fileResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadName;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.alert("첨부파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={isDownloading}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
    >
      {isDownloading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Paperclip className="size-4 shrink-0" aria-hidden />
      )}
      <span className="truncate">{fileName ?? "첨부파일"}</span>
      <Download className="size-4 shrink-0 opacity-60" aria-hidden />
    </button>
  );
}
