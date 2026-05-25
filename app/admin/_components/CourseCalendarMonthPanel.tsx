"use client";

import { useMemo } from "react";

import {
  formatEventScheduleDisplayLabel,
  getEducationPhaseLabel,
  type EducationCalendarDay,
} from "@/lib/course-schedule";
import {
  buildCurriculumColorMap,
  buildMonthGridCells,
  buildSundayWeekLabelsByDate,
  formatMonthTitle,
  getTodayDateString,
  WEEKDAY_LABELS,
} from "@/lib/course-calendar-grid";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  label: string;
  subLabel?: string;
  tone: "holiday" | "lesson" | "unassigned" | "schedule";
  color?: string;
};

function appendEventScheduleEvents(
  day: EducationCalendarDay,
  events: CalendarEvent[],
): void {
  for (const evt of day.eventSchedules ?? []) {
    events.push({
      id: `schedule-${day.date}-${evt.id}`,
      label: formatEventScheduleDisplayLabel(
        evt.label,
        evt.startTime,
        evt.endTime,
      ),
      tone: "schedule",
    });
  }
}

function dayToEvents(
  day: EducationCalendarDay | undefined,
  colorByKey: Map<string, string>,
): CalendarEvent[] {
  if (!day) return [];

  const events: CalendarEvent[] = [];

  if (!day.isInstructional) {
    const reason = day.excludedReason ?? "휴일";
    if (reason !== "토요일" && reason !== "일요일") {
      events.push({
        id: `${day.date}-off`,
        label: reason,
        tone: "holiday",
      });
    }
    appendEventScheduleEvents(day, events);
    return events;
  }

  if (day.curriculum) {
    const dayPart =
      day.lectureDayIndex && day.lectureDayTotal
        ? ` (${day.lectureDayIndex}/${day.lectureDayTotal}일차)`
        : "";
    const colorKey = day.curriculumItemId ?? day.curriculum;
    const phaseLabel = getEducationPhaseLabel(day.educationPhase);
    const subLabelParts = [
      phaseLabel,
      day.instructor ? `강사 ${day.instructor}` : null,
    ].filter(Boolean);

    events.push({
      id: `${day.date}-lesson`,
      label: `${day.curriculum}${dayPart}`,
      subLabel:
        subLabelParts.length > 0 ? subLabelParts.join(" · ") : undefined,
      tone: "lesson",
      color: colorByKey.get(colorKey),
    });
    appendEventScheduleEvents(day, events);
    return events;
  }

  if ((day.eventSchedules?.length ?? 0) > 0) {
    appendEventScheduleEvents(day, events);
    return events;
  }

  events.push({
    id: `${day.date}-empty`,
    label: "교육일 (미배정)",
    tone: "unassigned",
  });
  return events;
}

const eventToneClass: Record<
  Exclude<CalendarEvent["tone"], "lesson">,
  string
> = {
  holiday: "text-[#d50000] font-medium px-0.5",
  unassigned:
    "rounded px-1.5 py-0.5 bg-[#f6bf26] text-[#3c4043] hover:bg-[#e6b01f]",
  schedule: "text-[#3c4043] font-medium px-0.5",
};

function CalendarEventPill({ event }: { event: CalendarEvent }) {
  const isHolidayLabel = event.tone === "holiday";
  const isLesson = event.tone === "lesson";
  const isSchedule = event.tone === "schedule";

  return (
    <div
      className={cn(
        "text-[11px] leading-snug truncate cursor-default",
        isLesson
          ? "rounded px-1.5 py-0.5 text-white"
          : isSchedule
            ? eventToneClass.schedule
            : event.tone === "holiday"
              ? eventToneClass.holiday
              : eventToneClass.unassigned,
      )}
      style={
        isLesson && event.color
          ? { backgroundColor: event.color }
          : isLesson
            ? { backgroundColor: "#e67c73" }
            : undefined
      }
      title={[event.label, event.subLabel].filter(Boolean).join(" · ")}
    >
      <span className={cn("block truncate", isHolidayLabel && "font-medium")}>
        {event.label}
      </span>
      {event.subLabel ? (
        <span className="block truncate opacity-90 text-[10px]">
          {event.subLabel}
        </span>
      ) : null}
    </div>
  );
}

export function useCourseCalendarDerivedData(days: EducationCalendarDay[]) {
  const dayByDate = useMemo(() => {
    const map = new Map<string, EducationCalendarDay>();
    for (const day of days) {
      map.set(day.date, day);
    }
    return map;
  }, [days]);

  const colorByKey = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ key: string; name: string }> = [];

    for (const day of days) {
      if (!day.curriculum) continue;
      const key = day.curriculumItemId ?? day.curriculum;
      if (seen.has(key)) continue;
      seen.add(key);
      const phaseLabel = getEducationPhaseLabel(day.educationPhase);
      const name = phaseLabel
        ? `${phaseLabel} · ${day.curriculum}`
        : day.curriculum;
      items.push({ key, name });
    }

    return buildCurriculumColorMap(items).colorByKey;
  }, [days]);

  const sundayWeekLabelsByDate = useMemo(
    () => buildSundayWeekLabelsByDate(days),
    [days],
  );

  return { dayByDate, colorByKey, sundayWeekLabelsByDate };
}

type CourseCalendarMonthPanelProps = {
  viewMonth: { year: number; monthIndex: number };
  dayByDate: Map<string, EducationCalendarDay>;
  colorByKey: Map<string, string>;
  sundayWeekLabelsByDate: Map<string, string[]>;
  /** false면 월 제목 행 숨김 (상단 툴바와 함께 쓸 때) */
  showMonthHeader?: boolean;
};

/** 한 달 그리드 (툴바 없음) */
export default function CourseCalendarMonthPanel({
  viewMonth,
  dayByDate,
  colorByKey,
  sundayWeekLabelsByDate,
  showMonthHeader = true,
}: CourseCalendarMonthPanelProps) {
  const gridCells = useMemo(
    () => buildMonthGridCells(viewMonth.year, viewMonth.monthIndex),
    [viewMonth],
  );
  const todayStr = getTodayDateString();
  const monthTitle = formatMonthTitle(viewMonth.year, viewMonth.monthIndex);

  return (
    <div className="bg-white text-[#3c4043]">
      {showMonthHeader ? (
        <div className="border-b border-[#dadce0] px-4 py-2.5">
          <h3 className="text-lg font-medium text-[#3c4043]">{monthTitle}</h3>
        </div>
      ) : null}

      <div className="grid grid-cols-7 border-b border-[#dadce0]">
        {WEEKDAY_LABELS.map((label, index) => (
          <div
            key={label}
            className={cn(
              "py-2 text-center text-[11px] font-medium text-[#70757a]",
              (index === 0 || index === 6) && "text-[#d50000]",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {gridCells.map((cell) => {
          const dayData = dayByDate.get(cell.date);
          const inCourseRange = Boolean(dayData);
          const events = inCourseRange ? dayToEvents(dayData, colorByKey) : [];
          const isToday = cell.date === todayStr;
          const [y, m, d] = cell.date.split("-").map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();
          const isSunday = dayOfWeek === 0;
          const isWeekend = isSunday || dayOfWeek === 6;
          const sundayWeekLabels = isSunday
            ? sundayWeekLabelsByDate.get(cell.date)
            : undefined;

          return (
            <div
              key={cell.date}
              className={cn(
                "min-h-[100px] border-b border-r border-[#dadce0] p-1 flex flex-col",
                !cell.inCurrentMonth && "bg-[#f8f9fa]",
              )}
            >
              <div className="flex justify-end mb-0.5">
                <span
                  className={cn(
                    "inline-flex size-7 items-center justify-center text-xs tabular-nums",
                    !cell.inCurrentMonth && "text-[#9aa0a6]",
                    cell.inCurrentMonth &&
                      !isToday &&
                      (isWeekend ? "text-[#d50000]" : "text-[#3c4043]"),
                    isToday &&
                      "rounded-full bg-[#1a73e8] text-white font-medium",
                  )}
                >
                  {cell.dayNumber}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                {sundayWeekLabels?.map((label) => (
                  <div
                    key={label}
                    className="text-[11px] font-semibold leading-snug text-[#1a73e8] truncate px-0.5"
                    title={label}
                  >
                    {label}
                  </div>
                ))}
                {events.map((event) => (
                  <CalendarEventPill key={event.id} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
