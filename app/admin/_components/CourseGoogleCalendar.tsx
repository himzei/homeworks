"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { EducationCalendarDay } from "@/lib/course-schedule";
import {
  formatMonthTitle,
  getTodayDateString,
  isSameMonth,
  listMonthsInDateRange,
  parseYearMonthFromDate,
} from "@/lib/course-calendar-grid";
import { Button } from "@/app/_components/ui/button";

import CourseCalendarMonthPanel, {
  useCourseCalendarDerivedData,
} from "./CourseCalendarMonthPanel";

type CourseGoogleCalendarProps = {
  days: EducationCalendarDay[];
  /** 캘린더 헤더 오른쪽 (과정 필터 등) */
  headerEnd?: React.ReactNode;
};

/**
 * 구글 캘린더 스타일 월간 그리드 (한 달씩 탐색)
 */
export default function CourseGoogleCalendar({
  days,
  headerEnd,
}: CourseGoogleCalendarProps) {
  const { dayByDate, colorByKey, sundayWeekLabelsByDate, courseDayByDate } =
    useCourseCalendarDerivedData(days);

  const rangeBounds = useMemo(() => {
    if (days.length === 0) return null;
    return {
      start: days[0].date,
      end: days[days.length - 1].date,
    };
  }, [days]);

  const monthsInRange = useMemo(() => {
    if (!rangeBounds) return [];
    return listMonthsInDateRange(rangeBounds.start, rangeBounds.end);
  }, [rangeBounds]);

  const initialMonth = useMemo(() => {
    if (monthsInRange.length === 0) {
      const today = getTodayDateString();
      return parseYearMonthFromDate(today);
    }

    const today = getTodayDateString();
    const todayMonth = parseYearMonthFromDate(today);
    const inRange = monthsInRange.some((m) => isSameMonth(m, todayMonth));
    if (inRange) return todayMonth;

    return monthsInRange[0];
  }, [monthsInRange]);

  const [viewMonth, setViewMonth] = useState(initialMonth);

  const todayStr = getTodayDateString();
  const monthTitle = formatMonthTitle(viewMonth.year, viewMonth.monthIndex);

  const currentIndex = monthsInRange.findIndex((m) =>
    isSameMonth(m, viewMonth),
  );

  const goPrevMonth = () => {
    if (currentIndex > 0) {
      setViewMonth(monthsInRange[currentIndex - 1]);
      return;
    }
    const monthIndex = viewMonth.monthIndex === 0 ? 11 : viewMonth.monthIndex - 1;
    const year =
      viewMonth.monthIndex === 0 ? viewMonth.year - 1 : viewMonth.year;
    setViewMonth({ year, monthIndex });
  };

  const goNextMonth = () => {
    if (
      currentIndex >= 0 &&
      currentIndex < monthsInRange.length - 1
    ) {
      setViewMonth(monthsInRange[currentIndex + 1]);
      return;
    }
    const monthIndex = viewMonth.monthIndex === 11 ? 0 : viewMonth.monthIndex + 1;
    const year =
      viewMonth.monthIndex === 11 ? viewMonth.year + 1 : viewMonth.year;
    setViewMonth({ year, monthIndex });
  };

  const goToday = () => {
    if (monthsInRange.length === 0) {
      setViewMonth(parseYearMonthFromDate(todayStr));
      return;
    }
    const todayMonth = parseYearMonthFromDate(todayStr);
    const inRange = monthsInRange.some((m) => isSameMonth(m, todayMonth));
    setViewMonth(inRange ? todayMonth : monthsInRange[0]);
  };

  return (
    <div className="rounded-xl border border-[#dadce0] bg-white text-[#3c4043] shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dadce0] px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2" data-export-ignore>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goToday}
              className="h-9 rounded-full border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4] font-medium shadow-none"
            >
              오늘
            </Button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={goPrevMonth}
                className="inline-flex size-9 items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                aria-label="이전 달"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="inline-flex size-9 items-center justify-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
                aria-label="다음 달"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <h3 className="text-xl sm:text-[22px] font-normal text-[#3c4043] tracking-tight truncate">
            {monthTitle}
          </h3>
        </div>
        {headerEnd ? (
          <div
            className="flex flex-wrap items-center justify-end gap-2 shrink-0"
            data-export-ignore
          >
            {headerEnd}
          </div>
        ) : null}
      </div>

      <CourseCalendarMonthPanel
        viewMonth={viewMonth}
        dayByDate={dayByDate}
        colorByKey={colorByKey}
        sundayWeekLabelsByDate={sundayWeekLabelsByDate}
        courseDayByDate={courseDayByDate}
        showMonthHeader={false}
      />
    </div>
  );
}
