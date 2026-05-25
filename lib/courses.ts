import {
  buildEducationCalendar,
  customHolidayDates,
  formatDateRangeLabel,
  parseCurriculumItems,
  parseCustomHolidays,
  parseEducationCalendar,
  parseEventSchedules,
  serializeCurriculumItems,
  serializeCustomHolidays,
  serializeEventSchedules,
  type CourseEventSchedule,
  type CurriculumItem,
  type CustomHoliday,
  type EducationCalendarDay,
  type HolidayExclusionOptions,
} from "@/lib/course-schedule";

export type {
  CourseEventSchedule,
  CurriculumItem,
  CustomHoliday,
  EducationCalendarDay,
  HolidayExclusionOptions,
};

/** DB training_courses 행 */
export type TrainingCourseRecord = {
  id: string;
  name: string;
  description: string | null;
  is_legacy: boolean;
  is_active: boolean;
  sort_order: number;
  pre_education_start_date: string | null;
  pre_education_end_date: string | null;
  pre_education_curriculum: unknown;
  main_education_start_date: string | null;
  main_education_end_date: string | null;
  main_education_curriculum: unknown;
  pre_education_calendar: unknown;
  main_education_calendar: unknown;
  exclude_saturday: boolean;
  exclude_sunday: boolean;
  exclude_legal_holidays: boolean;
  exclude_substitute_holidays: boolean;
  custom_excluded_dates: string[] | null;
  custom_holidays: unknown;
  event_schedules: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 게시판 목록용 과정 아이템 */
export type TrainingCourseListItem = {
  id: string;
  name: string;
  description: string | null;
  isLegacy: boolean;
  isActive: boolean;
  sortOrder: number;
  studentCount: number;
  preEducationPeriod: string | null;
  mainEducationPeriod: string | null;
  curriculumItemCount: number;
  createdAt: string;
};

/** 상세 페이지용 과정 */
export type TrainingCourseDetail = {
  id: string;
  name: string;
  description: string | null;
  isLegacy: boolean;
  isActive: boolean;
  sortOrder: number;
  preEducationPeriod: string | null;
  mainEducationPeriod: string | null;
  preEducationCurriculum: CurriculumItem[];
  mainEducationCurriculum: CurriculumItem[];
  preEducationCalendar: EducationCalendarDay[];
  mainEducationCalendar: EducationCalendarDay[];
  holidayOptions: HolidayExclusionOptions;
  eventSchedules: CourseEventSchedule[];
  createdAt: string;
  updatedAt: string;
};

/** 폼 초기값 */
export type CourseFormValues = {
  name: string;
  description: string;
  isLegacy: boolean;
  sortOrder: string;
  preEducationStartDate: string;
  preEducationEndDate: string;
  preEducationCurriculum: CurriculumItem[];
  mainEducationStartDate: string;
  mainEducationEndDate: string;
  mainEducationCurriculum: CurriculumItem[];
  excludeSaturday: boolean;
  excludeSunday: boolean;
  excludeLegalHolidays: boolean;
  excludeSubstituteHolidays: boolean;
  customHolidays: CustomHoliday[];
  eventSchedules: CourseEventSchedule[];
};

export function createDefaultCourseFormValues(): CourseFormValues {
  return {
    name: "",
    description: "",
    isLegacy: false,
    sortOrder: "",
    preEducationStartDate: "",
    preEducationEndDate: "",
    preEducationCurriculum: [],
    mainEducationStartDate: "",
    mainEducationEndDate: "",
    mainEducationCurriculum: [],
    excludeSaturday: true,
    excludeSunday: true,
    excludeLegalHolidays: true,
    excludeSubstituteHolidays: true,
    customHolidays: [],
    eventSchedules: [],
  };
}

/** DB 행 → 휴일 옵션 */
export function recordToHolidayOptions(
  record: Pick<
    TrainingCourseRecord,
    | "exclude_saturday"
    | "exclude_sunday"
    | "exclude_legal_holidays"
    | "exclude_substitute_holidays"
    | "custom_excluded_dates"
  > & { custom_holidays?: unknown },
): HolidayExclusionOptions {
  return {
    excludeSaturday: record.exclude_saturday ?? true,
    excludeSunday: record.exclude_sunday ?? true,
    excludeLegalHolidays: record.exclude_legal_holidays ?? true,
    excludeSubstituteHolidays: record.exclude_substitute_holidays ?? true,
    customHolidays: parseCustomHolidays(
      record.custom_holidays,
      record.custom_excluded_dates ?? [],
    ),
  };
}

export function courseRecordToFormValues(
  record: TrainingCourseRecord,
): CourseFormValues {
  return {
    name: record.name,
    description: record.description ?? "",
    isLegacy: record.is_legacy,
    sortOrder: String(record.sort_order),
    preEducationStartDate: record.pre_education_start_date ?? "",
    preEducationEndDate: record.pre_education_end_date ?? "",
    preEducationCurriculum: parseCurriculumItems(record.pre_education_curriculum),
    mainEducationStartDate: record.main_education_start_date ?? "",
    mainEducationEndDate: record.main_education_end_date ?? "",
    mainEducationCurriculum: parseCurriculumItems(record.main_education_curriculum),
    excludeSaturday: record.exclude_saturday ?? true,
    excludeSunday: record.exclude_sunday ?? true,
    excludeLegalHolidays: record.exclude_legal_holidays ?? true,
    excludeSubstituteHolidays: record.exclude_substitute_holidays ?? true,
    customHolidays: parseCustomHolidays(
      record.custom_holidays,
      record.custom_excluded_dates ?? [],
    ),
    eventSchedules: parseEventSchedules(record.event_schedules),
  };
}

export function formValuesToHolidayOptions(
  values: CourseFormValues,
): HolidayExclusionOptions {
  return {
    excludeSaturday: values.excludeSaturday,
    excludeSunday: values.excludeSunday,
    excludeLegalHolidays: values.excludeLegalHolidays,
    excludeSubstituteHolidays: values.excludeSubstituteHolidays,
    customHolidays: serializeCustomHolidays(values.customHolidays),
  };
}

function buildCalendarsForForm(values: CourseFormValues) {
  const holidayOptions = formValuesToHolidayOptions(values);
  const preCurriculum = serializeCurriculumItems(values.preEducationCurriculum);
  const mainCurriculum = serializeCurriculumItems(values.mainEducationCurriculum);

  return {
    pre_education_calendar: buildEducationCalendar(
      values.preEducationStartDate,
      values.preEducationEndDate,
      preCurriculum,
      holidayOptions,
    ),
    main_education_calendar: buildEducationCalendar(
      values.mainEducationStartDate,
      values.mainEducationEndDate,
      mainCurriculum,
      holidayOptions,
    ),
  };
}

export function formValuesToDbPayload(
  values: CourseFormValues,
  createdBy?: string,
) {
  const parsedSortOrder = values.sortOrder.trim()
    ? Number.parseInt(values.sortOrder, 10)
    : 0;

  const calendars = buildCalendarsForForm(values);
  const serializedCustomHolidays = serializeCustomHolidays(values.customHolidays);
  const serializedEventSchedules = serializeEventSchedules(values.eventSchedules);

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    is_legacy: values.isLegacy,
    sort_order: Number.isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
    pre_education_start_date: values.preEducationStartDate || null,
    pre_education_end_date: values.preEducationEndDate || null,
    pre_education_curriculum: serializeCurriculumItems(
      values.preEducationCurriculum,
    ),
    main_education_start_date: values.mainEducationStartDate || null,
    main_education_end_date: values.mainEducationEndDate || null,
    main_education_curriculum: serializeCurriculumItems(
      values.mainEducationCurriculum,
    ),
    pre_education_calendar: calendars.pre_education_calendar,
    main_education_calendar: calendars.main_education_calendar,
    exclude_saturday: values.excludeSaturday,
    exclude_sunday: values.excludeSunday,
    exclude_legal_holidays: values.excludeLegalHolidays,
    exclude_substitute_holidays: values.excludeSubstituteHolidays,
    custom_holidays: serializedCustomHolidays,
    custom_excluded_dates: customHolidayDates(serializedCustomHolidays),
    event_schedules: serializedEventSchedules,
    ...(createdBy ? { created_by: createdBy } : {}),
  };
}

export function toTrainingCourseDetail(
  record: TrainingCourseRecord,
): TrainingCourseDetail {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isLegacy: record.is_legacy,
    isActive: record.is_active,
    sortOrder: record.sort_order,
    preEducationPeriod: formatDateRangeLabel(
      record.pre_education_start_date,
      record.pre_education_end_date,
    ),
    mainEducationPeriod: formatDateRangeLabel(
      record.main_education_start_date,
      record.main_education_end_date,
    ),
    preEducationCurriculum: parseCurriculumItems(record.pre_education_curriculum),
    mainEducationCurriculum: parseCurriculumItems(
      record.main_education_curriculum,
    ),
    preEducationCalendar: resolveEducationCalendar(
      record.pre_education_calendar,
      record.pre_education_start_date,
      record.pre_education_end_date,
      record.pre_education_curriculum,
      record,
    ),
    mainEducationCalendar: resolveEducationCalendar(
      record.main_education_calendar,
      record.main_education_start_date,
      record.main_education_end_date,
      record.main_education_curriculum,
      record,
    ),
    holidayOptions: recordToHolidayOptions(record),
    eventSchedules: parseEventSchedules(record.event_schedules),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/** 저장된 캘린더가 없으면 커리큘럼·기간으로 재생성 (레거시 데이터 호환) */
function resolveEducationCalendar(
  stored: unknown,
  startDate: string | null,
  endDate: string | null,
  curriculumRaw: unknown,
  record: TrainingCourseRecord,
): EducationCalendarDay[] {
  const parsed = parseEducationCalendar(stored);
  if (parsed.length > 0) return parsed;

  if (!startDate || !endDate) return [];

  return buildEducationCalendar(
    startDate,
    endDate,
    parseCurriculumItems(curriculumRaw),
    recordToHolidayOptions(record),
  );
}

export function toTrainingCourseListItem(
  record: TrainingCourseRecord,
  studentCount = 0,
): TrainingCourseListItem {
  const preCurriculum = parseCurriculumItems(record.pre_education_curriculum);
  const mainCurriculum = parseCurriculumItems(record.main_education_curriculum);

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    isLegacy: record.is_legacy,
    isActive: record.is_active,
    sortOrder: record.sort_order,
    studentCount,
    preEducationPeriod: formatDateRangeLabel(
      record.pre_education_start_date,
      record.pre_education_end_date,
    ),
    mainEducationPeriod: formatDateRangeLabel(
      record.main_education_start_date,
      record.main_education_end_date,
    ),
    curriculumItemCount: preCurriculum.length + mainCurriculum.length,
    createdAt: record.created_at,
  };
}

/** 과정명 앞 기수 라벨 추출 (예: 15기) */
export function extractCourseShortLabel(fullName: string): string {
  const match = fullName.match(/^(\d+기)/);
  return match ? match[1] : fullName;
}
