import {
  formatDateRangeLabel,
  parseCurriculumItems,
  parseCustomExcludedDatesInput,
  serializeCurriculumItems,
  type CurriculumItem,
  type HolidayExclusionOptions,
} from "@/lib/course-schedule";

export type { CurriculumItem, HolidayExclusionOptions };

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
  exclude_saturday: boolean;
  exclude_sunday: boolean;
  exclude_legal_holidays: boolean;
  exclude_substitute_holidays: boolean;
  custom_excluded_dates: string[] | null;
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
  customExcludedDatesInput: string;
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
    customExcludedDatesInput: "",
  };
}

export function courseRecordToFormValues(
  record: TrainingCourseRecord,
): CourseFormValues {
  const customDates = record.custom_excluded_dates ?? [];

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
    customExcludedDatesInput: customDates.join("\n"),
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
    customExcludedDates: parseCustomExcludedDatesInput(
      values.customExcludedDatesInput,
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
    exclude_saturday: values.excludeSaturday,
    exclude_sunday: values.excludeSunday,
    exclude_legal_holidays: values.excludeLegalHolidays,
    exclude_substitute_holidays: values.excludeSubstituteHolidays,
    custom_excluded_dates: parseCustomExcludedDatesInput(
      values.customExcludedDatesInput,
    ),
    ...(createdBy ? { created_by: createdBy } : {}),
  };
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
