import {
  applyEventSchedulesToCalendar,
  mergeEducationCalendars,
} from "@/lib/course-schedule";
import type { TrainingCourseDetail } from "@/lib/courses";

import CourseCalendarSection from "./CourseCalendarSection";
import CurriculumDetailSection from "./CurriculumDetailSection";

type CourseDetailArticleProps = {
  course: TrainingCourseDetail;
  /** 상단 헤더에 과정 설명을 표시할 때 본문 중복 제거 */
  hideDescription?: boolean;
};

function buildPeriodSummary(course: TrainingCourseDetail): string | null {
  const parts = [
    course.preEducationPeriod
      ? `사전교육 ${course.preEducationPeriod}`
      : null,
    course.mainEducationPeriod
      ? `본교육 ${course.mainEducationPeriod}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * 과정 상세 — 커리큘럼·통합 캘린더를 세로로 표시
 */
export default function CourseDetailArticle({
  course,
  hideDescription = false,
}: CourseDetailArticleProps) {
  const hasPre =
    course.preEducationCurriculum.length > 0 ||
    course.preEducationCalendar.length > 0 ||
    course.preEducationPeriod;
  const hasMain =
    course.mainEducationCurriculum.length > 0 ||
    course.mainEducationCalendar.length > 0 ||
    course.mainEducationPeriod;

  const mergedCalendar = applyEventSchedulesToCalendar(
    mergeEducationCalendars(
      course.preEducationCalendar,
      course.mainEducationCalendar,
    ),
    course.eventSchedules,
  );
  const hasCalendar =
    mergedCalendar.length > 0 || course.eventSchedules.length > 0;

  return (
    <article className="space-y-12">
      {!hideDescription && course.description ? (
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50 mb-2">
            과정 설명
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {course.description}
          </p>
        </section>
      ) : null}

      {hasCalendar ? (
        <section className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <CourseCalendarSection
            title="교육 일정 캘린더"
            days={mergedCalendar}
            periodSummary={buildPeriodSummary(course)}
            downloadFilenameBase={course.name}
          />
        </section>
      ) : null}

      {hasPre || hasMain ? (
        <section className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-10">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            커리큘럼
          </h2>
          {hasPre ? (
            <CurriculumDetailSection
              asSubsection
              title="사전교육"
              periodLabel={course.preEducationPeriod}
              items={course.preEducationCurriculum}
            />
          ) : null}
          {hasMain ? (
            <CurriculumDetailSection
              asSubsection
              title="본교육"
              periodLabel={course.mainEducationPeriod}
              items={course.mainEducationCurriculum}
            />
          ) : null}
        </section>
      ) : null}

      {!hasPre && !hasMain && !hasCalendar ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center">
          사전교육·본교육 일정과 커리큘럼이 아직 없습니다. 수정 화면에서
          등록해 주세요.
        </p>
      ) : null}
    </article>
  );
}
