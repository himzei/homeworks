import {
  KOREAN_PUBLIC_HOLIDAYS_BY_YEAR,
  type KoreanHoliday,
  type KoreanHolidayType,
} from "@/lib/data/korean-public-holidays";

/** 휴일 제외 옵션 */
export type HolidayExclusionOptions = {
  excludeSaturday: boolean;
  excludeSunday: boolean;
  excludeLegalHolidays: boolean;
  excludeSubstituteHolidays: boolean;
  /** YYYY-MM-DD */
  customExcludedDates: string[];
};

/** 커리큘럼 항목 (DB JSON과 동일) */
export type CurriculumItem = {
  id: string;
  title: string;
  contents: string;
  sort_order: number;
};

export function createEmptyCurriculumItem(sortOrder = 0): CurriculumItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    contents: "",
    sort_order: sortOrder,
  };
}

/** DB/폼에서 받은 JSON을 정규화 */
export function parseCurriculumItems(raw: unknown): CurriculumItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const contents =
        typeof row.contents === "string" ? row.contents.trim() : "";
      if (!title && !contents) return null;

      return {
        id:
          typeof row.id === "string" && row.id
            ? row.id
            : crypto.randomUUID(),
        title,
        contents,
        sort_order:
          typeof row.sort_order === "number" ? row.sort_order : index,
      };
    })
    .filter((item): item is CurriculumItem => item !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** 저장용 — 빈 항목 제거 */
export function serializeCurriculumItems(
  items: CurriculumItem[],
): CurriculumItem[] {
  return items
    .map((item, index) => ({
      ...item,
      title: item.title.trim(),
      contents: item.contents.trim(),
      sort_order: index,
    }))
    .filter((item) => item.title || item.contents);
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

function buildExcludedDateSet(
  startDate: string,
  endDate: string,
  options: HolidayExclusionOptions,
): Set<string> {
  const excluded = new Set<string>(options.customExcludedDates);

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

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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
      if (options.customExcludedDates.includes(dateStr)) {
        excludedReason = "추가 휴일";
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
