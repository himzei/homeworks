"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  downloadBlobAsFile,
  downloadFileFromSignedUrl,
  fetchAdminTeamAttachmentSignedUrl,
} from "@/lib/team-attachment-utils";

import TeamAttachmentPreviewContent from "./TeamAttachmentPreviewContent";

type TeamAttachmentPreviewModalProps = {
  isOpen: boolean;
  snapshotId: string;
  teamNumber: number;
  fileName: string;
  /** 로컬 파일 미리보기용 (저장 전) */
  localPreviewUrl?: string | null;
  onClose: () => void;
};

/**
 * 첨부파일 미리보기 모달 (관리자)
 */
export default function TeamAttachmentPreviewModal({
  isOpen,
  snapshotId,
  teamNumber,
  fileName,
  localPreviewUrl,
  onClose,
}: TeamAttachmentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setErrorMessage(null);
      return;
    }

    // 한글 주석: 로컬 blob URL이 있으면 서버 조회 없이 바로 미리보기
    if (localPreviewUrl) {
      setPreviewUrl(localPreviewUrl);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    void (async () => {
      const result = await fetchAdminTeamAttachmentSignedUrl(snapshotId, teamNumber);
      if (cancelled) return;

      if ("error" in result) {
        setErrorMessage(result.error);
        setPreviewUrl(null);
      } else {
        setPreviewUrl(result.signedUrl);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, localPreviewUrl, snapshotId, teamNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      if (localPreviewUrl) {
        const response = await fetch(localPreviewUrl);
        const blob = await response.blob();
        downloadBlobAsFile(blob, fileName);
        return;
      }

      const result = await fetchAdminTeamAttachmentSignedUrl(snapshotId, teamNumber);
      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }

      const downloadError = await downloadFileFromSignedUrl(
        result.signedUrl,
        result.fileName ?? fileName,
      );
      if (downloadError) {
        setErrorMessage(downloadError);
      }
    } catch {
      setErrorMessage("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-attachment-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="미리보기 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2
            id="team-attachment-preview-title"
            className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {fileName}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloading || isLoading}
              onClick={() => void handleDownload()}
            >
              {isDownloading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              다운로드
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
              <Loader2 className="mr-2 size-5 animate-spin" />
              미리보기 불러오는 중...
            </div>
          ) : errorMessage ? (
            <p role="alert" className="py-8 text-center text-sm text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          ) : previewUrl ? (
            <TeamAttachmentPreviewContent
              previewUrl={previewUrl}
              fileName={fileName}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
