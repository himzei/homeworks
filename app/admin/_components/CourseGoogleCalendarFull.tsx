"use client";

import { useMemo } from "react";

import type { EducationCalendarDay } from "@/lib/course-schedule";
import { listMonthsInDateRange } from "@/lib/course-calendar-grid";

import CourseCalendarMonthPanel, {
  useCourseCalendarDerivedData,
} from "./CourseCalendarMonthPanel";

type CourseGoogleCalendarFullProps = {
  days: EducationCalendarDay[];
};

/**
 * 교육 기간 내 모든 월을 세로로 렌더 (전체 일정 PNG 캡처용)
 */
export default function CourseGoogleCalendarFull({
  days,
}: CourseGoogleCalendarFullProps) {
  const { dayByDate, colorByKey, sundayWeekLabelsByDate, courseDayByDate } =
    useCourseCalendarDerivedData(days);

  const monthsInRange = useMemo(() => {
    if (days.length === 0) return [];
    return listMonthsInDateRange(days[0].date, days[days.length - 1].date);
  }, [days]);

  return (
    <div className="w-[960px] max-w-full rounded-xl border border-[#dadce0] bg-white text-[#3c4043] shadow-sm overflow-hidden">
      {monthsInRange.map((viewMonth, index) => (
        <div
          key={`${viewMonth.year}-${viewMonth.monthIndex}`}
          className={index > 0 ? "border-t border-[#dadce0]" : undefined}
        >
          <CourseCalendarMonthPanel
            viewMonth={viewMonth}
            dayByDate={dayByDate}
            colorByKey={colorByKey}
            sundayWeekLabelsByDate={sundayWeekLabelsByDate}
            courseDayByDate={courseDayByDate}
          />
        </div>
      ))}
    </div>
  );
}
