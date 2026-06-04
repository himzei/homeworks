"use client";

import { FileText } from "lucide-react";

import {
  canPreviewTeamAttachment,
  getTeamAttachmentPreviewKind,
} from "@/lib/team-attachment-utils";

type TeamAttachmentPreviewContentProps = {
  previewUrl: string;
  fileName: string;
  className?: string;
};

/**
 * 첨부파일 미리보기 본문
 * - 이미지·PDF는 인라인 미리보기, 그 외는 파일 정보 카드
 */
export default function TeamAttachmentPreviewContent({
  previewUrl,
  fileName,
  className,
}: TeamAttachmentPreviewContentProps) {
  const previewKind = getTeamAttachmentPreviewKind(fileName);

  if (previewKind === "image") {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={`${fileName} 미리보기`}
          className="mx-auto max-h-[70vh] max-w-full rounded-md object-contain"
        />
      </div>
    );
  }

  if (previewKind === "pdf") {
    return (
      <iframe
        src={previewUrl}
        title={`${fileName} 미리보기`}
        className={className ?? "h-[70vh] w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white"}
      />
    );
  }

  return (
    <div
      className={
        className ??
        "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-12 text-center"
      }
    >
      <FileText className="size-12 text-zinc-400" aria-hidden />
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-all">
        {fileName}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {canPreviewTeamAttachment(fileName)
          ? "미리보기를 지원하지 않는 형식입니다."
          : "PPT·한글·엑셀 등은 다운로드 후 확인해 주세요."}
      </p>
      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        새 탭에서 열기
      </a>
    </div>
  );
}
