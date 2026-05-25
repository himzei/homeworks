"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  downloadClonedElementAsPng,
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import type { EducationCalendarDay } from "@/lib/course-schedule";

import CourseGoogleCalendar from "./CourseGoogleCalendar";
import CourseGoogleCalendarFull from "./CourseGoogleCalendarFull";

type CourseCalendarSectionProps = {
  title?: string;
  days: EducationCalendarDay[];
  /** 기간 요약 (선택) */
  periodSummary?: string | null;
  /** PNG 파일명 접두 (과정명 등) */
  downloadFilenameBase?: string;
  /** true면 상단 제목·기간 없이 다운로드 버튼만 표시 (교육일정 페이지 등) */
  hideTitle?: boolean;
};

/**
 * 상세보기 — 구글 캘린더 스타일 월간 일정 + 이미지 다운로드
 */
export default function CourseCalendarSection({
  title = "교육 일정 캘린더",
  days,
  periodSummary,
  downloadFilenameBase = "교육일정",
  hideTitle = false,
}: CourseCalendarSectionProps) {
  const monthExportRef = useRef<HTMLDivElement>(null);
  const fullExportRef = useRef<HTMLDivElement>(null);
  const [isDownloadingMonth, setIsDownloadingMonth] = useState(false);
  const [isDownloadingFull, setIsDownloadingFull] = useState(false);

  const isDownloading = isDownloadingMonth || isDownloadingFull;
  const dateLabel = new Date().toISOString().slice(0, 10);

  const handleDownloadMonthImage = useCallback(async () => {
    const element = monthExportRef.current;
    if (!element) return;

    setIsDownloadingMonth(true);
    try {
      const safeName = sanitizeDownloadFilename(downloadFilenameBase);
      await downloadElementAsPng(
        element,
        `${safeName}_교육일정캘린더_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloadingMonth(false);
    }
  }, [dateLabel, downloadFilenameBase]);

  const handleDownloadFullImage = useCallback(async () => {
    const element = fullExportRef.current;
    if (!element) return;

    setIsDownloadingFull(true);
    try {
      const safeName = sanitizeDownloadFilename(downloadFilenameBase);
      await downloadClonedElementAsPng(
        element,
        `${safeName}_교육일정캘린더_전체_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloadingFull(false);
    }
  }, [dateLabel, downloadFilenameBase]);

  const downloadButtons =
    days.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleDownloadMonthImage()}
          disabled={isDownloading}
          data-export-ignore
        >
          {isDownloadingMonth ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Download className="size-4" />
              현재 교육일정
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleDownloadFullImage()}
          disabled={isDownloading}
          data-export-ignore
        >
          {isDownloadingFull ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Download className="size-4" />
              전체 교육일정
            </>
          )}
        </Button>
      </div>
    ) : null;

  return (
    <section className="space-y-4">
      {hideTitle ? (
        downloadButtons ? (
          <div className="flex justify-end">{downloadButtons}</div>
        ) : null
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {title}
            </h2>
            {periodSummary ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {periodSummary}
              </p>
            ) : null}
          </div>
          {downloadButtons}
        </div>
      )}

      {days.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-5 text-center">
          캘린더를 만들려면 교육 기간과 커리큘럼을 등록한 뒤 과정을 저장해
          주세요.
        </p>
      ) : (
        <>
          <div ref={monthExportRef} className="rounded-xl overflow-hidden">
            <CourseGoogleCalendar days={days} />
          </div>

          {/* 전체 기간 PNG — display:none (캡처 시 복제본을 뷰포트에 올림) */}
          <div ref={fullExportRef} className="hidden" aria-hidden>
            <CourseGoogleCalendarFull days={days} />
          </div>
        </>
      )}
    </section>
  );
}
