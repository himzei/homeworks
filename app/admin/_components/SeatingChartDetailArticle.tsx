"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import { Button } from "@/app/_components/ui/button";

import type { StudentOfficerInfo } from "@/lib/class-officers";

import SeatingGrid from "./SeatingGrid";

type SeatingChartDetailArticleProps = {
  title: string;
  createdAtLabel: string;
  createdAtIso: string;
  groupName: string | null;
  rowCount: number;
  colCount: number;
  aisleAfterColumns: number[];
  seatAssignments: Record<string, string>;
  assignedCount: number;
  totalSeats: number;
  profileIdByName?: Record<string, string>;
  avatarUrlByName?: Record<string, string>;
  officerByStudentName?: Record<string, StudentOfficerInfo>;
  /** false면 조·조장 배지만 숨김 (반장·명예 배지는 표시) */
  showTeamBadges?: boolean;
};

/**
 * 자리배치도 상세 본문 + PNG 다운로드
 */
export default function SeatingChartDetailArticle({
  title,
  createdAtLabel,
  createdAtIso,
  groupName,
  rowCount,
  colCount,
  aisleAfterColumns,
  seatAssignments,
  assignedCount,
  totalSeats,
  profileIdByName,
  avatarUrlByName,
  officerByStudentName,
  showTeamBadges = true,
}: SeatingChartDetailArticleProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const metaLine = `${groupName ?? "전체 공통"} · ${rowCount}행 × ${colCount}열 · ${assignedCount}/${totalSeats}명 배치${
    aisleAfterColumns.length > 0
      ? ` · 통로 ${aisleAfterColumns.join(", ")}열 뒤`
      : ""
  }`;

  const handleDownloadImage = useCallback(async () => {
    const element = exportRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const dateLabel = new Date(createdAtIso).toISOString().slice(0, 10);
      const safeTitle = sanitizeDownloadFilename(title);
      await downloadElementAsPng(
        element,
        `${safeTitle}_자리배치도_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  }, [createdAtIso, title]);

  return (
    <article className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-zinc-50">
              {title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              작성일{" "}
              <time dateTime={createdAtIso}>{createdAtLabel}</time>
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {metaLine}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDownloadImage()}
            disabled={isDownloading}
            data-export-ignore
            className="shrink-0"
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Download className="size-4" />
                이미지 다운로드
              </>
            )}
          </Button>
        </div>
      </header>

      {/* PNG 캡처 영역 — 제목·작성일 + 배치도 */}
      <div
        ref={exportRef}
        className="px-4 sm:px-6 py-6 bg-zinc-50 dark:bg-zinc-900/30"
      >
        <div className="mb-4 text-center">
          <p className="text-base sm:text-lg font-bold text-black dark:text-zinc-50">
            {title}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            작성일 {createdAtLabel}
          </p>
        </div>
        <div className="overflow-x-auto flex justify-center">
          <SeatingGrid
            rowCount={rowCount}
            colCount={colCount}
            aisleAfterColumns={aisleAfterColumns}
            seatAssignments={seatAssignments}
            editable={false}
            profileIdByName={profileIdByName}
            avatarUrlByName={avatarUrlByName}
            officerByStudentName={officerByStudentName}
            showTeamBadges={showTeamBadges}
          />
        </div>
      </div>
    </article>
  );
}
