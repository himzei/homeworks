import {
  KOREAN_PUBLIC_HOLIDAYS_BY_YEAR,
  type KoreanHoliday,
  type KoreanHolidayType,
} from "@/lib/data/korean-public-holidays";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 직접 입력한 휴일 */
export type CustomHoliday = {
  id: string;
  date: string;
  label: string;
};

/** 휴일 제외 옵션 */
export type HolidayExclusionOptions = {
  excludeSaturday: boolean;
  excludeSunday: boolean;
  excludeLegalHolidays: boolean;
  excludeSubstituteHolidays: boolean;
  /** 날짜·표시 이름 직접 입력 */
  customHolidays: CustomHoliday[];
};

export function createEmptyCustomHoliday(): CustomHoliday {
  return {
    id: crypto.randomUUID(),
    date: "",
    label: "",
  };
}

/** DB/폼 JSON 정규화 (없으면 legacy DATE[] 사용) */
export function parseCustomHolidays(
  raw: unknown,
  legacyDates: string[] = [],
): CustomHoliday[] {
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const date = typeof row.date === "string" ? row.date.trim() : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parseIsoDateOnly(date)) {
          return null;
        }
        const label = typeof row.label === "string" ? row.label.trim() : "";
        return {
          id:
            typeof row.id === "string" && row.id
              ? row.id
              : crypto.randomUUID(),
          date,
          label,
        };
      })
      .filter((item): item is CustomHoliday => item !== null);

    if (parsed.length > 0) {
      return parsed.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  return legacyDates
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && parseIsoDateOnly(date))
    .map((date) => ({
      id: crypto.randomUUID(),
      date,
      label: "",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 저장용 — 날짜·이름 있는 항목만 */
export function serializeCustomHolidays(
  holidays: CustomHoliday[],
): CustomHoliday[] {
  return holidays
    .map((item) => ({
      ...item,
      date: item.date.trim(),
      label: item.label.trim(),
    }))
    .filter((item) => item.date && item.label)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function customHolidayDates(holidays: CustomHoliday[]): string[] {
  return holidays.map((item) => item.date);
}

/** 커리큘럼 항목 (DB JSON과 동일) */
export type CurriculumItem = {
  id: string;
  /** 커리큘럼(주제) */
  curriculum: string;
  /** 강사 */
  instructor: string;
  /** 강의 일수 */
  lectureDays: string;
  sort_order: number;
};

export function createEmptyCurriculumItem(sortOrder = 0): CurriculumItem {
  return {
    id: crypto.randomUUID(),
    curriculum: "",
    instructor: "",
    lectureDays: "",
    sort_order: sortOrder,
  };
}

function parseCurriculumField(row: Record<string, unknown>): {
  curriculum: string;
  instructor: string;
  lectureDays: string;
} {
  const legacyTitle =
    typeof row.title === "string" ? row.title.trim() : "";
  const legacyContents =
    typeof row.contents === "string" ? row.contents.trim() : "";

  const curriculum =
    (typeof row.curriculum === "string" ? row.curriculum.trim() : "") ||
    legacyTitle ||
    legacyContents;

  const instructor =
    typeof row.instructor === "string" ? row.instructor.trim() : "";

  const lectureDays =
    (typeof row.lecture_days === "string"
      ? row.lecture_days.trim()
      : typeof row.lecture_days === "number"
        ? String(row.lecture_days)
        : "") ||
    (typeof row.lectureDays === "string" ? row.lectureDays.trim() : "");

  return { curriculum, instructor, lectureDays };
}

function hasCurriculumItemContent(item: {
  curriculum: string;
  instructor: string;
  lectureDays: string;
}): boolean {
  return Boolean(item.curriculum || item.instructor || item.lectureDays);
}

/** DB/폼에서 받은 JSON을 정규화 */
export function parseCurriculumItems(raw: unknown): CurriculumItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fields = parseCurriculumField(row);
      if (!hasCurriculumItemContent(fields)) return null;

      return {
        id:
          typeof row.id === "string" && row.id
            ? row.id
            : crypto.randomUUID(),
        curriculum: fields.curriculum,
        instructor: fields.instructor,
        lectureDays: fields.lectureDays,
        sort_order:
          typeof row.sort_order === "number" ? row.sort_order : index,
      };
    })
    .filter((item): item is CurriculumItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** 드래그로 항목 순서 변경 */
export function reorderCurriculumItems(
  items: CurriculumItem[],
  fromId: string,
  toId: string,
): CurriculumItem[] | null {
  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return null;
  }

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  return reordered.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

/** 일별 캘린더 항목 (DB JSON과 동일) */
export type EducationCalendarDay = {
  date: string;
  weekdayLabel: string;
  isInstructional: boolean;
  excludedReason?: string;
  curriculum?: string;
  instructor?: string;
  curriculumItemId?: string;
  /** 해당 커리큘럼 항목의 N일차 */
  lectureDayIndex?: number;
  /** 해당 커리큘럼 항목 총 강의일수 */
  lectureDayTotal?: number;
  /** 상세 통합 캘린더 표시용 */
  educationPhase?: "pre" | "main";
  /** 행사 일정 (커리큘럼 아래 텍스트로 표시) */
  eventSchedules?: Array<{
    id: string;
    label: string;
    startTime?: string;
    endTime?: string;
  }>;
};

/** 행사 일정 */
export type CourseEventSchedule = {
  id: string;
  date: string;
  label: string;
  /** HH:mm (선택) */
  startTime?: string;
  /** HH:mm (선택) */
  endTime?: string;
};

const EVENT_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseOptionalEventTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return EVENT_TIME_PATTERN.test(trimmed) ? trimmed : undefined;
}

/** 시간 직접 입력 → HH:mm (유효하지 않으면 null, 빈 값은 "") */
export function normalizeEventTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (EVENT_TIME_PATTERN.test(trimmed)) return trimmed;

  const withColon = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (withColon) {
    const hours = Number(withColon[1]);
    const minutes = Number(withColon[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return null;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length >= 3 && digitsOnly.length <= 4) {
    const padded = digitsOnly.padStart(4, "0");
    const hours = Number(padded.slice(0, 2));
    const minutes = Number(padded.slice(2, 4));
    if (hours <= 23 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  return null;
}

/** 행사 시간 범위 표시 — 예: (14:00~16:00) */
export function formatEventScheduleTimeRange(
  startTime?: string,
  endTime?: string,
): string | null {
  const start = parseOptionalEventTime(startTime);
  const end = parseOptionalEventTime(endTime);
  if (start && end) return `(${start}~${end})`;
  if (start) return `(${start}~)`;
  if (end) return `(~${end})`;
  return null;
}

/** 캘린더·상세용 행사 라벨 */
export function formatEventScheduleDisplayLabel(
  label: string,
  startTime?: string,
  endTime?: string,
): string {
  const range = formatEventScheduleTimeRange(startTime, endTime);
  return range ? `${label} ${range}` : label;
}

export function createEmptyCourseEventSchedule(): CourseEventSchedule {
  return {
    id: crypto.randomUUID(),
    date: "",
    label: "",
    startTime: "",
    endTime: "",
  };
}

export function parseEventSchedules(raw: unknown): CourseEventSchedule[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const date = typeof row.date === "string" ? row.date.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parseIsoDateOnly(date)) {
        return null;
      }
      const label = typeof row.label === "string" ? row.label.trim() : "";
      if (!label) return null;

      const startTime = parseOptionalEventTime(row.startTime);
      const endTime = parseOptionalEventTime(row.endTime);

      return {
        id:
          typeof row.id === "string" && row.id
            ? row.id
            : crypto.randomUUID(),
        date,
        label,
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
      };
    })
    .filter((item): item is CourseEventSchedule => item !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function serializeEventSchedules(
  schedules: CourseEventSchedule[],
): CourseEventSchedule[] {
  return schedules
    .map((item) => {
      const startTime = parseOptionalEventTime(item.startTime);
      const endTime = parseOptionalEventTime(item.endTime);
      return {
        id: item.id,
        date: item.date.trim(),
        label: item.label.trim(),
        ...(startTime ? { startTime } : {}),
        ...(endTime ? { endTime } : {}),
      };
    })
    .filter((item) => item.date && item.label)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 통합 캘린더에 행사 일정 반영 */
export function applyEventSchedulesToCalendar(
  days: EducationCalendarDay[],
  schedules: CourseEventSchedule[],
): EducationCalendarDay[] {
  const byDate = new Map<string, EducationCalendarDay>();

  for (const day of days) {
    byDate.set(day.date, {
      ...day,
      eventSchedules: day.eventSchedules ? [...day.eventSchedules] : [],
    });
  }

  for (const schedule of schedules) {
    const existing = byDate.get(schedule.date);
    const entry = {
      id: schedule.id,
      label: schedule.label,
      ...(schedule.startTime ? { startTime: schedule.startTime } : {}),
      ...(schedule.endTime ? { endTime: schedule.endTime } : {}),
    };

    if (existing) {
      byDate.set(schedule.date, {
        ...existing,
        eventSchedules: [...(existing.eventSchedules ?? []), entry],
      });
      continue;
    }

    const parsed = parseIsoDateOnly(schedule.date);
    if (!parsed) continue;

    byDate.set(schedule.date, {
      date: schedule.date,
      weekdayLabel: WEEKDAY_LABELS[parsed.getDay()],
      isInstructional: false,
      eventSchedules: [entry],
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const EDUCATION_PHASE_LABEL = {
  pre: "사전교육",
  main: "본교육",
} as const;

/** 사전·본교육 캘린더를 하나로 병합 (상세보기용) */
export function mergeEducationCalendars(
  preDays: EducationCalendarDay[],
  mainDays: EducationCalendarDay[],
): EducationCalendarDay[] {
  const byDate = new Map<string, EducationCalendarDay>();

  for (const day of preDays) {
    byDate.set(day.date, {
      ...day,
      educationPhase: "pre",
      curriculumItemId: day.curriculumItemId
        ? `pre:${day.curriculumItemId}`
        : undefined,
    });
  }

  for (const day of mainDays) {
    if (byDate.has(day.date)) continue;
    byDate.set(day.date, {
      ...day,
      educationPhase: "main",
      curriculumItemId: day.curriculumItemId
        ? `main:${day.curriculumItemId}`
        : undefined,
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function getEducationPhaseLabel(
  phase: EducationCalendarDay["educationPhase"],
): string | null {
  if (!phase) return null;
  return EDUCATION_PHASE_LABEL[phase];
}

/** 강의일수 문자열 → 숫자 (비어 있으면 1일) */
export function parseLectureDaysCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 1;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 365);
}

/**
 * 기간·휴일 설정·커리큘럼으로 일별 캘린더 생성
 * 교육일에 커리큘럼 항목 순서대로 강의일수만큼 배정
 */
export function buildEducationCalendar(
  startDate: string,
  endDate: string,
  curriculum: CurriculumItem[],
  options: HolidayExclusionOptions,
): EducationCalendarDay[] {
  if (!startDate || !endDate) return [];

  const scheduleDays = buildScheduleDays(startDate, endDate, options);
  if (scheduleDays.length === 0) return [];

  const instructionalDates = scheduleDays
    .filter((day) => !day.excludedReason)
    .map((day) => day.date);

  const assignmentByDate = new Map<
    string,
    Pick<
      EducationCalendarDay,
      | "curriculum"
      | "instructor"
      | "curriculumItemId"
      | "lectureDayIndex"
      | "lectureDayTotal"
    >
  >();

  let slotIndex = 0;
  for (const item of curriculum) {
    const dayCount = parseLectureDaysCount(item.lectureDays);
    for (let lectureIndex = 0; lectureIndex < dayCount; lectureIndex++) {
      if (slotIndex >= instructionalDates.length) break;
      const date = instructionalDates[slotIndex];
      assignmentByDate.set(date, {
        curriculum: item.curriculum,
        instructor: item.instructor,
        curriculumItemId: item.id,
        lectureDayIndex: lectureIndex + 1,
        lectureDayTotal: dayCount,
      });
      slotIndex++;
    }
  }

  return scheduleDays.map((day) => {
    const assignment = assignmentByDate.get(day.date);
    const isInstructional = !day.excludedReason;

    return {
      date: day.date,
      weekdayLabel: day.weekdayLabel,
      isInstructional,
      excludedReason: day.excludedReason,
      ...(isInstructional && assignment ? assignment : {}),
    };
  });
}

/** DB/폼에서 받은 캘린더 JSON 정규화 */
export function parseEducationCalendar(raw: unknown): EducationCalendarDay[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.date !== "string" || !row.date) return null;

      const isInstructional = row.isInstructional !== false;
      const weekdayLabel =
        typeof row.weekdayLabel === "string" ? row.weekdayLabel : "";

      const base: EducationCalendarDay = {
        date: row.date,
        weekdayLabel,
        isInstructional,
        excludedReason:
          typeof row.excludedReason === "string"
            ? row.excludedReason
            : undefined,
      };

      if (!isInstructional) return base;

      const curriculum =
        typeof row.curriculum === "string" ? row.curriculum : undefined;
      const instructor =
        typeof row.instructor === "string" ? row.instructor : undefined;

      return {
        ...base,
        curriculum,
        instructor,
        curriculumItemId:
          typeof row.curriculumItemId === "string"
            ? row.curriculumItemId
            : undefined,
        lectureDayIndex:
          typeof row.lectureDayIndex === "number"
            ? row.lectureDayIndex
            : undefined,
        lectureDayTotal:
          typeof row.lectureDayTotal === "number"
            ? row.lectureDayTotal
            : undefined,
      };
    })
    .filter((day): day is EducationCalendarDay => day !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 저장용 — 빈 항목 제거 */
export function serializeCurriculumItems(
  items: CurriculumItem[],
): CurriculumItem[] {
  return items
    .map((item, index) => ({
      ...item,
      curriculum: item.curriculum.trim(),
      instructor: item.instructor.trim(),
      lectureDays: item.lectureDays.trim(),
      sort_order: index,
    }))
    .filter(hasCurriculumItemContent);
}

function parseIsoDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 기간 내 해당 연도 공휴일 조회 */
export function getHolidaysInRange(
  startDate: string,
  endDate: string,
): KoreanHoliday[] {
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate);
  if (!start || !end || start > end) return [];

  const years = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y);
  }

  const result: KoreanHoliday[] = [];
  for (const year of years) {
    const holidays = KOREAN_PUBLIC_HOLIDAYS_BY_YEAR[year] ?? [];
    for (const holiday of holidays) {
      if (holiday.date >= startDate && holiday.date <= endDate) {
        result.push(holiday);
      }
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function isHolidayTypeExcluded(
  type: KoreanHolidayType,
  options: HolidayExclusionOptions,
): boolean {
  if (type === "legal") return options.excludeLegalHolidays;
  if (type === "substitute") return options.excludeSubstituteHolidays;
  return false;
}

function buildCustomHolidayLabelMap(
  options: HolidayExclusionOptions,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const holiday of options.customHolidays) {
    map.set(holiday.date, holiday.label.trim() || holiday.date);
  }
  return map;
}

function buildExcludedDateSet(
  startDate: string,
  endDate: string,
  options: HolidayExclusionOptions,
): Set<string> {
  const excluded = new Set<string>(customHolidayDates(options.customHolidays));

  const holidays = getHolidaysInRange(startDate, endDate);
  for (const holiday of holidays) {
    if (isHolidayTypeExcluded(holiday.type, options)) {
      excluded.add(holiday.date);
    }
  }

  return excluded;
}

export type InstructionalDay = {
  date: string;
  weekdayLabel: string;
  excludedReason?: string;
};

/** 기간 내 일별 목록 (교육일·제외일 구분) */
export function buildScheduleDays(
  startDate: string,
  endDate: string,
  options: HolidayExclusionOptions,
): InstructionalDay[] {
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate);
  if (!start || !end || start > end) return [];

  const excludedDates = buildExcludedDateSet(startDate, endDate, options);
  const customHolidayLabels = buildCustomHolidayLabelMap(options);
  const holidayNameByDate = new Map<string, string>();
  for (const holiday of getHolidaysInRange(startDate, endDate)) {
    holidayNameByDate.set(holiday.date, holiday.name);
  }

  const days: InstructionalDay[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateStr = formatDateOnly(cursor);
    const dayOfWeek = cursor.getDay();
    let excludedReason: string | undefined;

    if (options.excludeSunday && dayOfWeek === 0) {
      excludedReason = "일요일";
    } else if (options.excludeSaturday && dayOfWeek === 6) {
      excludedReason = "토요일";
    } else if (excludedDates.has(dateStr)) {
      if (customHolidayLabels.has(dateStr)) {
        excludedReason = customHolidayLabels.get(dateStr);
      } else {
        excludedReason = holidayNameByDate.get(dateStr) ?? "공휴일";
      }
    }

    days.push({
      date: dateStr,
      weekdayLabel: WEEKDAY_LABELS[dayOfWeek],
      excludedReason,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/** 휴일 제외 후 순수 교육일 수 */
export function countInstructionalDays(
  startDate: string,
  endDate: string,
  options: HolidayExclusionOptions,
): number {
  return buildScheduleDays(startDate, endDate, options).filter(
    (day) => !day.excludedReason,
  ).length;
}

/** 날짜 범위 유효성 검사 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  label: string,
): string | null {
  if (!startDate && !endDate) return null;
  if (!startDate || !endDate) {
    return `${label} 시작일과 종료일을 모두 입력해 주세요.`;
  }
  const start = parseIsoDateOnly(startDate);
  const end = parseIsoDateOnly(endDate);
  if (!start || !end) {
    return `${label} 날짜 형식이 올바르지 않습니다.`;
  }
  if (start > end) {
    return `${label} 종료일은 시작일 이후여야 합니다.`;
  }
  return null;
}

/** 쉼표·줄바꿈으로 구분된 추가 휴일 파싱 */
export function parseCustomExcludedDatesInput(input: string): string[] {
  const parts = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const valid: string[] = [];
  for (const part of parts) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) continue;
    if (parseIsoDateOnly(part)) valid.push(part);
  }
  return [...new Set(valid)];
}

export function formatCustomExcludedDatesForInput(dates: string[]): string {
  return dates.join("\n");
}

/** 목록·상세용 기간 문자열 */
export function formatDateRangeLabel(
  start: string | null,
  end: string | null,
): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} ~ ${end}`;
  return start ?? end;
}
