"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";

import { KOREAN_PUBLIC_HOLIDAYS_BY_YEAR } from "@/lib/data/korean-public-holidays";
import {
  buildScheduleDays,
  countInstructionalDays,
  type HolidayExclusionOptions,
} from "@/lib/course-schedule";

type CourseSchedulePreviewProps = {
  title: string;
  startDate: string;
  endDate: string;
  holidayOptions: HolidayExclusionOptions;
};

/**
 * 기간별 교육일·제외일 미리보기
 */
export default function CourseSchedulePreview({
  title,
  startDate,
  endDate,
  holidayOptions,
}: CourseSchedulePreviewProps) {
  const days = useMemo(
    () => buildScheduleDays(startDate, endDate, holidayOptions),
    [startDate, endDate, holidayOptions],
  );

  const instructionalCount = useMemo(
    () => countInstructionalDays(startDate, endDate, holidayOptions),
    [startDate, endDate, holidayOptions],
  );

  if (!startDate || !endDate) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {title} 시작일·종료일을 입력하면 교육일 수가 계산됩니다.
      </p>
    );
  }

  if (days.length === 0) {
    return (
      <p className="text-xs text-red-600 dark:text-red-400">
        날짜 범위를 확인해 주세요.
      </p>
    );
  }

  const excludedDays = days.filter((day) => day.excludedReason);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <CalendarDays className="size-4 shrink-0" />
        {title} 일정 미리보기
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        총 <strong>{days.length}일</strong> 중 휴일 제외 후{" "}
        <strong className="text-blue-600 dark:text-blue-400">
          {instructionalCount}일
        </strong>
        교육
      </p>

      {excludedDays.length > 0 ? (
        <details className="text-xs text-zinc-600 dark:text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
            제외일 {excludedDays.length}일 보기
          </summary>
          <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 pl-1">
            {excludedDays.map((day) => (
              <li key={day.date}>
                {day.date} ({day.weekdayLabel}) — {day.excludedReason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {holidayOptions.excludeLegalHolidays &&
      (() => {
        const startYear = Number.parseInt(startDate.slice(0, 4), 10);
        const endYear = Number.parseInt(endDate.slice(0, 4), 10);
        for (let year = startYear; year <= endYear; year++) {
          if (!KOREAN_PUBLIC_HOLIDAYS_BY_YEAR[year]) return true;
        }
        return false;
      })() ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          일부 연도의 법정공휴일 데이터가 없습니다. 휴일 직접 입력란에
          날짜와 이름을 등록해 주세요.
        </p>
      ) : null}
    </div>
  );
}
