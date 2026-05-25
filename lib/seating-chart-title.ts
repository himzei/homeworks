import { extractCourseShortLabel, recordToHolidayOptions } from "@/lib/courses";
import {
  buildScheduleDays,
  type HolidayExclusionOptions,
} from "@/lib/course-schedule";

/** 자리배치도 제목 생성에 필요한 과정 일정 */
export type CourseScheduleForTitle = {
  mainEducationStartDate: string | null;
  holidayOptions: HolidayExclusionOptions;
};

/** 오늘 날짜 (한국 시간, YYYY-MM-DD) */
export function getTodayDateStringInKorea(referenceDate = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(referenceDate);
}

/**
 * 본교육 시작일 ~ 기준일 사이 교육일 수로 주차 계산
 * - 휴일 제외 옵션 반영
 * - 5교육일 = 1주차
 */
export function computeMainEducationWeekNumber(
  mainEducationStartDate: string,
  referenceDate: string,
  holidayOptions: HolidayExclusionOptions,
): number {
  if (!mainEducationStartDate) return 1;

  if (referenceDate < mainEducationStartDate) {
    return 1;
  }

  const days = buildScheduleDays(
    mainEducationStartDate,
    referenceDate,
    holidayOptions,
  );
  const instructionalDayCount = days.filter((day) => !day.excludedReason).length;

  if (instructionalDayCount <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(instructionalDayCount / 5));
}

/** DB 과정 행 → 제목 계산용 일정 */
export function toCourseScheduleForTitle(
  record: Parameters<typeof recordToHolidayOptions>[0] & {
    main_education_start_date: string | null;
  },
): CourseScheduleForTitle {
  return {
    mainEducationStartDate: record.main_education_start_date,
    holidayOptions: recordToHolidayOptions(record),
  };
}

/** 제목 접미사 */
const SEATING_CHART_TITLE_SUFFIX = "자리배치도";

/**
 * 자리배치도 기본 제목 (예: 15기 2주차 자리배치도)
 */
export function buildSeatingChartDefaultTitle(
  courseName: string,
  schedule: CourseScheduleForTitle | undefined,
  referenceDate?: string,
): string {
  const cohortLabel = extractCourseShortLabel(courseName.trim() || "과정");
  const today = referenceDate ?? getTodayDateStringInKorea();

  if (!schedule?.mainEducationStartDate) {
    return `${cohortLabel} 1주차 ${SEATING_CHART_TITLE_SUFFIX}`;
  }

  const weekNumber = computeMainEducationWeekNumber(
    schedule.mainEducationStartDate,
    today,
    schedule.holidayOptions,
  );

  return `${cohortLabel} ${weekNumber}주차 ${SEATING_CHART_TITLE_SUFFIX}`;
}

/** 과정명 → 일정 맵 (서버에서 전달) */
export function buildCourseScheduleMap(
  courses: Array<{
    name: string;
    main_education_start_date: string | null;
    exclude_saturday: boolean;
    exclude_sunday: boolean;
    exclude_legal_holidays: boolean;
    exclude_substitute_holidays: boolean;
    custom_excluded_dates: string[] | null;
  }>,
): Record<string, CourseScheduleForTitle> {
  const map: Record<string, CourseScheduleForTitle> = {};
  for (const course of courses) {
    map[course.name] = toCourseScheduleForTitle(course);
  }
  return map;
}
