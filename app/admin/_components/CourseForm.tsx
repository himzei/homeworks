"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/app/_components/ui/button";
import { validateDateRange } from "@/lib/course-schedule";
import {
  normalizeCourseSlug,
  suggestCourseSlugFromName,
  validateCourseSlug,
} from "@/lib/admin/course-slug";
import {
  createDefaultCourseFormValues,
  formValuesToHolidayOptions,
  type CourseFormValues,
} from "@/lib/courses";

import CourseSchedulePreview from "./CourseSchedulePreview";
import CurriculumEditor from "./CurriculumEditor";
import CustomHolidayEditor from "./CustomHolidayEditor";
import EventScheduleEditor from "./EventScheduleEditor";

type CourseFormProps = {
  /** 수정 모드일 때 과정 ID */
  courseId?: string;
  initialValues?: CourseFormValues;
  listPath?: string;
  submitLabel?: string;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * 과정 등록·수정 통합 폼
 */
export default function CourseForm({
  courseId,
  initialValues,
  listPath = "/admin/courses",
  submitLabel,
}: CourseFormProps) {
  const router = useRouter();
  const isEditMode = !!courseId;

  const [formData, setFormData] = useState<CourseFormValues>(
    initialValues ?? createDefaultCourseFormValues(),
  );
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(
    Boolean(initialValues?.slug?.trim()),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const holidayOptions = useMemo(
    () => formValuesToHolidayOptions(formData),
    [formData],
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // 등록 시 과정명 입력에 맞춰 슬러그 자동 제안
      if (
        name === "name" &&
        !isEditMode &&
        !isSlugManuallyEdited &&
        typeof value === "string"
      ) {
        next.slug = suggestCourseSlugFromName(value);
      }

      if (name === "slug" && typeof value === "string") {
        setIsSlugManuallyEdited(true);
        next.slug = normalizeCourseSlug(value);
      }

      return next;
    });
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError("과정명을 입력해 주세요.");
      return;
    }
    if (trimmedName.length < 4) {
      setFormError("과정명은 4자 이상 입력해 주세요.");
      return;
    }

    const slugError = validateCourseSlug(formData.slug);
    if (slugError) {
      setFormError(slugError);
      return;
    }

    const preRangeError = validateDateRange(
      formData.preEducationStartDate,
      formData.preEducationEndDate,
      "사전교육",
    );
    if (preRangeError) {
      setFormError(preRangeError);
      return;
    }

    const mainRangeError = validateDateRange(
      formData.mainEducationStartDate,
      formData.mainEducationEndDate,
      "본교육",
    );
    if (mainRangeError) {
      setFormError(mainRangeError);
      return;
    }

    if (formData.sortOrder.trim()) {
      const parsed = Number.parseInt(formData.sortOrder, 10);
      if (Number.isNaN(parsed)) {
        setFormError("정렬 순서는 숫자로 입력해 주세요.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/training-courses", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditMode && courseId
            ? {
                id: courseId,
                ...formData,
                slug: normalizeCourseSlug(formData.slug),
              }
            : {
                ...formData,
                slug: normalizeCourseSlug(formData.slug),
              },
        ),
      });

      const result = (await response.json()) as {
        error?: string;
        id?: string;
      };

      if (!response.ok) {
        setFormError(result.error ?? "저장 중 오류가 발생했습니다.");
        return;
      }

      // 저장 후 상세보기에서 캘린더·커리큘럼 확인
      const detailId = isEditMode ? courseId : result.id;
      if (detailId) {
        router.push(`/admin/courses/${detailId}`);
      } else {
        router.push(listPath);
      }
      router.refresh();
    } catch (error) {
      console.error("과정 저장 요청 오류:", error);
      setFormError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resolvedSubmitLabel =
    submitLabel ?? (isEditMode ? "변경 사항 저장" : "과정 등록");

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl">
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}

      {/* 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          기본 정보
        </h2>

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            과정명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder='예: 16기 교육생 - 빅데이터 전문가 양성과정'
            className={inputClassName}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            회원·과제 등에 연결되는 공식 과정명입니다. 변경 시 연관 데이터도
            함께 갱신됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="slug" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            슬러그 <span className="text-red-500">*</span>
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            value={formData.slug}
            onChange={handleChange}
            placeholder="예: 16gi"
            className={`${inputClassName} max-w-md font-mono`}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            영문 소문자, 숫자, 하이픈(-)만 사용합니다. 과정명과 별도로 관리됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            과정 설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className={`${inputClassName} resize-y min-h-[80px]`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sortOrder" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            정렬 순서
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            value={formData.sortOrder}
            onChange={handleChange}
            className={`${inputClassName} max-w-[200px]`}
          />
        </div>

        {!isEditMode ? (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="isLegacy"
              checked={formData.isLegacy}
              onChange={handleChange}
              className="mt-1 size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-medium">레거시 과정</span>
              <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                group_name이 없는 예전 과제·설문도 함께 표시 (13기 등)
              </span>
            </span>
          </label>
        ) : null}
      </section>

      {/* 휴일 제외 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          휴일·제외일 설정
        </h2>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            휴일 직접 입력
          </span>
          <CustomHolidayEditor
            holidays={formData.customHolidays}
            onChange={(customHolidays) =>
              setFormData((prev) => ({ ...prev, customHolidays }))
            }
          />
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            행사 일정
          </span>
          <EventScheduleEditor
            schedules={formData.eventSchedules}
            onChange={(eventSchedules) =>
              setFormData((prev) => ({ ...prev, eventSchedules }))
            }
          />
        </div>
      </section>

      {/* 사전교육 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          사전교육
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="preEducationStartDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              시작일
            </label>
            <input
              id="preEducationStartDate"
              name="preEducationStartDate"
              type="date"
              value={formData.preEducationStartDate}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="preEducationEndDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              종료일
            </label>
            <input
              id="preEducationEndDate"
              name="preEducationEndDate"
              type="date"
              value={formData.preEducationEndDate}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>

        <CourseSchedulePreview
          title="사전교육"
          startDate={formData.preEducationStartDate}
          endDate={formData.preEducationEndDate}
          holidayOptions={holidayOptions}
        />

        <CurriculumEditor
          label="사전교육 커리큘럼"
          items={formData.preEducationCurriculum}
          onChange={(items) =>
            setFormData((prev) => ({ ...prev, preEducationCurriculum: items }))
          }
        />
      </section>

      {/* 본교육 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          본교육
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="mainEducationStartDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              시작일
            </label>
            <input
              id="mainEducationStartDate"
              name="mainEducationStartDate"
              type="date"
              value={formData.mainEducationStartDate}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="mainEducationEndDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              종료일
            </label>
            <input
              id="mainEducationEndDate"
              name="mainEducationEndDate"
              type="date"
              value={formData.mainEducationEndDate}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>

        <CourseSchedulePreview
          title="본교육"
          startDate={formData.mainEducationStartDate}
          endDate={formData.mainEducationEndDate}
          holidayOptions={holidayOptions}
        />

        <CurriculumEditor
          label="본교육 커리큘럼"
          items={formData.mainEducationCurriculum}
          onChange={(items) =>
            setFormData((prev) => ({ ...prev, mainEducationCurriculum: items }))
          }
        />
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSubmitting ? "저장 중..." : resolvedSubmitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => router.push(listPath)}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
