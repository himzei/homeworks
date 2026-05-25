import { redirect } from "next/navigation";

import CourseCalendarSection from "@/app/admin/_components/CourseCalendarSection";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  applyEventSchedulesToCalendar,
  mergeEducationCalendars,
} from "@/lib/course-schedule";
import {
  extractCourseShortLabel,
  toTrainingCourseDetail,
  type TrainingCourseDetail,
  type TrainingCourseRecord,
} from "@/lib/courses";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "교육일정",
  description: "소속 과정의 사전·본교육 일정을 캘린더로 확인합니다.",
};

function buildPeriodSummary(detail: TrainingCourseDetail): string | null {
  const periodParts = [
    detail.preEducationPeriod
      ? `사전교육 ${detail.preEducationPeriod}`
      : null,
    detail.mainEducationPeriod
      ? `본교육 ${detail.mainEducationPeriod}`
      : null,
  ].filter((part): part is string => Boolean(part));

  return periodParts.length > 0 ? periodParts.join(" · ") : null;
}

function buildMergedCalendar(detail: TrainingCourseDetail) {
  return applyEventSchedulesToCalendar(
    mergeEducationCalendars(
      detail.preEducationCalendar,
      detail.mainEducationCalendar,
    ),
    detail.eventSchedules,
  );
}

type CourseScheduleSection = {
  courseName: string;
  cohortLabel: string | null;
  periodSummary: string | null;
  mergedCalendar: ReturnType<typeof buildMergedCalendar>;
};

/**
 * 회원 전용 교육일정 페이지
 * - 일반 회원: 프로필 과정(group_name) 일정만
 * - 관리자: 등록된 모든 과정 캘린더 (created_at 최신순)
 */
export default async function EducationSchedulePage() {
  const supabase = await createClient();
  const { profile } = await requireApprovedMember(supabase);

  const isAdmin = profile.role === "admin";
  const userGroupName = profile.group_name?.trim() || null;

  if (!isAdmin && !userGroupName) {
    redirect("/profile?group_required=1");
  }

  let pageTitle = "교육일정";
  let pageDescription: string | null = null;
  let cohortLabel: string | null = null;
  let courseSections: CourseScheduleSection[] = [];

  if (isAdmin) {
    pageDescription = "등록된 모든 과정의 교육일정입니다. 최신 등록 과정부터 표시됩니다.";

    const { data: courses, error } = await supabase
      .from("training_courses")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("교육일정 과정 목록 조회 오류:", error);
    }

    courseSections = (courses ?? []).flatMap((course) => {
      const detail = toTrainingCourseDetail(course as TrainingCourseRecord);
      const mergedCalendar = buildMergedCalendar(detail);
      if (mergedCalendar.length === 0) return [];

      return [
        {
          courseName: detail.name,
          cohortLabel: extractCourseShortLabel(detail.name),
          periodSummary: buildPeriodSummary(detail),
          mergedCalendar,
        },
      ];
    });
  } else {
    const targetGroupName = userGroupName!;
    pageTitle = targetGroupName;
    cohortLabel = extractCourseShortLabel(targetGroupName);

    const { data: course, error } = await supabase
      .from("training_courses")
      .select("*")
      .eq("name", targetGroupName)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("교육일정 과정 조회 오류:", error);
    }

    if (!course) {
      courseSections = [];
    } else {
      const detail = toTrainingCourseDetail(course as TrainingCourseRecord);
      const mergedCalendar = buildMergedCalendar(detail);

      if (mergedCalendar.length > 0) {
        courseSections = [
          {
            courseName: targetGroupName,
            cohortLabel,
            periodSummary: buildPeriodSummary(detail),
            mergedCalendar,
          },
        ];
      }
    }
  }

  let courseContent: React.ReactNode;

  if (courseSections.length === 0) {
    courseContent = (
      <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {isAdmin
          ? "등록된 교육일정 캘린더가 없습니다. 과정 관리에서 기간·커리큘럼을 등록해 주세요."
          : userGroupName ? (
            <>
              <span className="font-medium text-black dark:text-zinc-50">
                {userGroupName}
              </span>
              에 해당하는 교육일정이 없거나 활성 과정이 없습니다.
            </>
          ) : (
            "등록된 교육일정이 없습니다."
          )}
      </p>
    );
  } else if (isAdmin) {
    courseContent = (
      <div className="space-y-12">
        {courseSections.map((section) => (
          <section
            key={section.courseName}
            className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-8 first:border-t-0 first:pt-0"
          >
            <CourseCalendarSection
              days={section.mergedCalendar}
              downloadFilenameBase={section.courseName}
              periodSummary={section.periodSummary}
              hideTitle
              headerTitle={section.courseName}
            />
          </section>
        ))}
      </div>
    );
  } else {
    const section = courseSections[0]!;
    courseContent = (
      <div className="space-y-4">
        {section.periodSummary ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {section.periodSummary}
          </p>
        ) : null}
        <CourseCalendarSection
          days={section.mergedCalendar}
          downloadFilenameBase={section.courseName}
          hideTitle
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-start justify-center bg-white dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8">
        <div className="w-full space-y-4">
          <div className="w-full">
            {cohortLabel ? (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {cohortLabel}
              </span>
            ) : null}
            <h1
              className={cn(
                "text-xl font-bold text-black dark:text-zinc-50 sm:text-2xl",
                cohortLabel ? "mt-2" : null,
              )}
            >
              {pageTitle}
            </h1>
            {pageDescription ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {pageDescription}
              </p>
            ) : null}
          </div>

          {courseContent}
        </div>
      </div>
    </div>
  );
}
