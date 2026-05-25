import type { EducationCalendarDay } from "@/lib/course-schedule";

/** 월간 그리드 셀 */
export type CalendarGridCell = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export { WEEKDAY_LABELS };

function formatDateOnly(year: number, monthIndex: number, day: number): string {
  const y = year;
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → { year, monthIndex(0-11) } */
export function parseYearMonthFromDate(dateStr: string): {
  year: number;
  monthIndex: number;
} {
  const [year, month] = dateStr.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

/** 해당 월의 6주 그리드 (일요일 시작) */
export function buildMonthGridCells(
  year: number,
  monthIndex: number,
): CalendarGridCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startPadding = firstDay.getDay();

  const cells: CalendarGridCell[] = [];

  const prevMonthLast = new Date(year, monthIndex, 0).getDate();
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;

  for (let i = startPadding - 1; i >= 0; i--) {
    const day = prevMonthLast - i;
    cells.push({
      date: formatDateOnly(prevYear, prevMonthIndex, day),
      dayNumber: day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: formatDateOnly(year, monthIndex, day),
      dayNumber: day,
      inCurrentMonth: true,
    });
  }

  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: formatDateOnly(nextYear, nextMonthIndex, nextDay),
      dayNumber: nextDay,
      inCurrentMonth: false,
    });
    nextDay++;
  }

  while (cells.length < 42) {
    cells.push({
      date: formatDateOnly(nextYear, nextMonthIndex, nextDay),
      dayNumber: nextDay,
      inCurrentMonth: false,
    });
    nextDay++;
  }

  return cells;
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${year}년 ${monthIndex + 1}월`;
}

/** 기간 내 표시할 (년, 월) 목록 */
export function listMonthsInDateRange(
  startDate: string,
  endDate: string,
): Array<{ year: number; monthIndex: number }> {
  if (!startDate || !endDate) return [];

  const start = parseYearMonthFromDate(startDate);
  const end = parseYearMonthFromDate(endDate);
  const months: Array<{ year: number; monthIndex: number }> = [];

  let year = start.year;
  let monthIndex = start.monthIndex;

  while (
    year < end.year ||
    (year === end.year && monthIndex <= end.monthIndex)
  ) {
    months.push({ year, monthIndex });
    monthIndex++;
    if (monthIndex > 11) {
      monthIndex = 0;
      year++;
    }
  }

  return months;
}

/** 오늘 YYYY-MM-DD (로컬) */
export function getTodayDateString(): string {
  const now = new Date();
  return formatDateOnly(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isSameMonth(
  a: { year: number; monthIndex: number },
  b: { year: number; monthIndex: number },
): boolean {
  return a.year === b.year && a.monthIndex === b.monthIndex;
}

/** 구글 캘린더 톤 — 커리큘럼 항목별 pill 배경 */
export const CURRICULUM_EVENT_COLORS = [
  { bg: "#e67c73", label: "산호" },
  { bg: "#7986cb", label: "라벤더" },
  { bg: "#33b679", label: "민트" },
  { bg: "#8e24aa", label: "보라" },
  { bg: "#039be5", label: "하늘" },
  { bg: "#f4511e", label: "주황" },
  { bg: "#0b8043", label: "초록" },
  { bg: "#616161", label: "회색" },
  { bg: "#d50000", label: "빨강" },
  { bg: "#f6bf26", label: "노랑" },
] as const;

export type CurriculumLegendItem = {
  key: string;
  name: string;
  color: string;
};

/** 커리큘럼 항목 id(또는 이름) → 배경색·범례 */
export function buildCurriculumColorMap(
  items: Array<{ key: string; name: string }>,
): {
  colorByKey: Map<string, string>;
  legend: CurriculumLegendItem[];
} {
  const colorByKey = new Map<string, string>();
  const legend: CurriculumLegendItem[] = [];

  items.forEach((item, index) => {
    const color =
      CURRICULUM_EVENT_COLORS[index % CURRICULUM_EVENT_COLORS.length].bg;
    colorByKey.set(item.key, color);
    legend.push({ key: item.key, name: item.name, color });
  });

  return { colorByKey, legend };
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateStr(dateStr: string, dayCount: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + dayCount);
  return formatLocalDate(date);
}

/** 해당 날짜가 속한 주의 일요일 (그리드 열 기준) */
function sundayOnOrBefore(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() - date.getDay());
  return formatLocalDate(date);
}

type EducationPhaseRange = {
  phaseLabel: "사전교육" | "본교육";
  startDate: string;
  endDate: string;
};

function extractEducationPhaseRanges(
  days: EducationCalendarDay[],
): EducationPhaseRange[] {
  const preDates = days
    .filter((day) => day.educationPhase === "pre")
    .map((day) => day.date)
    .sort();
  const mainDates = days
    .filter((day) => day.educationPhase === "main")
    .map((day) => day.date)
    .sort();

  const ranges: EducationPhaseRange[] = [];
  if (preDates.length > 0) {
    ranges.push({
      phaseLabel: "사전교육",
      startDate: preDates[0],
      endDate: preDates[preDates.length - 1],
    });
  }
  if (mainDates.length > 0) {
    ranges.push({
      phaseLabel: "본교육",
      startDate: mainDates[0],
      endDate: mainDates[mainDates.length - 1],
    });
  }
  return ranges;
}

/** 일~토 행이 교육 기간과 겹치는지 */
function weekRowOverlapsRange(
  sundayDate: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  const rowEnd = addDaysToDateStr(sundayDate, 6);
  return sundayDate <= rangeEnd && rowEnd >= rangeStart;
}

function weekIndexForSundayRow(
  sundayDate: string,
  phaseStartDate: string,
): number {
  const anchorSunday = sundayOnOrBefore(phaseStartDate);
  const diffDays = Math.round(
    (parseLocalDate(sundayDate).getTime() -
      parseLocalDate(anchorSunday).getTime()) /
      86_400_000,
  );
  return Math.floor(diffDays / 7) + 1;
}

/**
 * 일요일 칸용 주차 라벨 — 예: "사전교육 1주차 ->"
 * (그리드 주 행: 일~토, 일요일 열에 표시)
 */
export function buildSundayWeekLabelsByDate(
  days: EducationCalendarDay[],
): Map<string, string[]> {
  const labelBySunday = new Map<string, string[]>();
  const ranges = extractEducationPhaseRanges(days);
  if (ranges.length === 0) return labelBySunday;

  const rangeStarts = ranges.map((range) => range.startDate).sort();
  const rangeEnds = ranges.map((range) => range.endDate).sort();
  const minStart = rangeStarts[0];
  const maxEnd = rangeEnds[rangeEnds.length - 1];

  let cursorSunday = sundayOnOrBefore(minStart);
  const lastSunday = sundayOnOrBefore(maxEnd);

  while (cursorSunday <= lastSunday) {
    const labels: string[] = [];

    for (const range of ranges) {
      if (!weekRowOverlapsRange(cursorSunday, range.startDate, range.endDate)) {
        continue;
      }
      const weekNumber = weekIndexForSundayRow(cursorSunday, range.startDate);
      labels.push(`${range.phaseLabel} ${weekNumber}주차 ->`);
    }

    if (labels.length > 0) {
      labelBySunday.set(cursorSunday, labels);
    }

    cursorSunday = addDaysToDateStr(cursorSunday, 7);
  }

  return labelBySunday;
}
