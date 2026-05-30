import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGACY_GROUPS } from "@/lib/constants";
import { resolveHomeworkScorePhase } from "@/lib/evaluation/scoring";
import {
  isAssignmentCountableAfterMemberRegistration,
  parseSupabaseUtcTimestamp,
} from "@/lib/format-date";

export type UserAssignmentSubmissionItem = {
  assignmentId: string;
  title: string;
  submission: {
    url: string | null;
    status: string;
    submittedAt: string;
  } | null;
};

export type UserAssignmentPhaseSection = {
  publishedAssignmentCount: number;
  submittedCount: number;
  submissionRatePercent: number;
  assignments: UserAssignmentSubmissionItem[];
};

export type UserAssignmentProgress = {
  courseGroupName: string | null;
  mainEducationStartDate: string | null;
  foundation: UserAssignmentPhaseSection;
  main: UserAssignmentPhaseSection;
  publishedAssignmentCount: number;
  submittedCount: number;
  submissionRatePercent: number;
  hasUnpublishedAssignments: boolean;
};

const emptyPhaseSection = (): UserAssignmentPhaseSection => ({
  publishedAssignmentCount: 0,
  submittedCount: 0,
  submissionRatePercent: 0,
  assignments: [],
});

function buildPhaseSection(
  assignments: UserAssignmentSubmissionItem[],
): UserAssignmentPhaseSection {
  const publishedAssignmentCount = assignments.length;
  const submittedCount = assignments.filter(
    (assignment) => assignment.submission !== null,
  ).length;

  return {
    publishedAssignmentCount,
    submittedCount,
    submissionRatePercent:
      publishedAssignmentCount > 0
        ? Math.round((submittedCount / publishedAssignmentCount) * 100)
        : 0,
    assignments,
  };
}

/** 사용자 과정 기준 게시된 과제·제출 현황 조회 (기초/본과정 구분) */
export async function fetchUserAssignmentProgress(
  supabase: SupabaseClient,
  userId: string,
  courseGroupName: string | null,
  memberRegisteredAt: string | null,
): Promise<UserAssignmentProgress> {
  const trimmedGroupName = courseGroupName?.trim() || null;

  if (!trimmedGroupName) {
    return {
      courseGroupName: null,
      mainEducationStartDate: null,
      foundation: emptyPhaseSection(),
      main: emptyPhaseSection(),
      publishedAssignmentCount: 0,
      submittedCount: 0,
      submissionRatePercent: 0,
      hasUnpublishedAssignments: false,
    };
  }

  const { data: trainingCourse, error: courseError } = await supabase
    .from("training_courses")
    .select("main_education_start_date")
    .eq("name", trimmedGroupName)
    .maybeSingle();

  if (courseError) {
    console.error("과정 정보 조회 오류:", courseError);
  }

  const mainEducationStartDate =
    trainingCourse?.main_education_start_date?.trim() || null;

  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, title, start_date")
    .order("created_at", { ascending: false });

  if (LEGACY_GROUPS.includes(trimmedGroupName as (typeof LEGACY_GROUPS)[number])) {
    const escapedGroupName = trimmedGroupName.replace(/"/g, '""');
    assignmentsQuery = assignmentsQuery.or(
      `group_name.is.null,group_name.eq."${escapedGroupName}"`,
    );
  } else {
    assignmentsQuery = assignmentsQuery.eq("group_name", trimmedGroupName);
  }

  const { data: assignmentsData, error: assignmentsError } =
    await assignmentsQuery;

  if (assignmentsError) {
    console.error("과제 목록 조회 오류:", assignmentsError);
    return {
      courseGroupName: trimmedGroupName,
      mainEducationStartDate,
      foundation: emptyPhaseSection(),
      main: emptyPhaseSection(),
      publishedAssignmentCount: 0,
      submittedCount: 0,
      submissionRatePercent: 0,
      hasUnpublishedAssignments: false,
    };
  }

  const now = new Date();
  const allAssignments = assignmentsData ?? [];
  const publishedAssignments = allAssignments.filter((assignment) => {
    const startDate = parseSupabaseUtcTimestamp(assignment.start_date);
    if (Number.isNaN(startDate.getTime()) || now < startDate) {
      return false;
    }

    if (
      memberRegisteredAt &&
      !isAssignmentCountableAfterMemberRegistration(
        assignment.start_date,
        memberRegisteredAt,
      )
    ) {
      return false;
    }

    return true;
  });
  const publishedAssignmentIds = publishedAssignments.map(
    (assignment) => assignment.id,
  );

  let homeworkRows:
    | {
        assignment_id: string;
        url: string | null;
        status: string | null;
        created_at: string;
      }[]
    | null = [];

  if (publishedAssignmentIds.length > 0) {
    const { data: homeworkData, error: homeworkError } = await supabase
      .from("homeworks")
      .select("assignment_id, url, status, created_at")
      .eq("user_id", userId)
      .in("assignment_id", publishedAssignmentIds);

    if (homeworkError) {
      console.error("과제 제출 조회 오류:", homeworkError);
    }

    homeworkRows = homeworkData;
  }

  const submissionByAssignmentId = new Map<
    string,
    UserAssignmentSubmissionItem["submission"]
  >();

  homeworkRows?.forEach((homework) => {
    submissionByAssignmentId.set(homework.assignment_id, {
      url: homework.url,
      status: homework.status || "검토중",
      submittedAt: homework.created_at,
    });
  });

  const foundationAssignments: UserAssignmentSubmissionItem[] = [];
  const mainAssignments: UserAssignmentSubmissionItem[] = [];

  for (const assignment of publishedAssignments) {
    const item: UserAssignmentSubmissionItem = {
      assignmentId: assignment.id,
      title: assignment.title,
      submission: submissionByAssignmentId.get(assignment.id) ?? null,
    };

    const phase = resolveHomeworkScorePhase(
      assignment.start_date,
      mainEducationStartDate,
    );

    if (phase === "foundation") {
      foundationAssignments.push(item);
    } else {
      mainAssignments.push(item);
    }
  }

  const foundation = buildPhaseSection(foundationAssignments);
  const main = buildPhaseSection(mainAssignments);
  const publishedAssignmentCount = publishedAssignments.length;
  const submittedCount = homeworkRows?.length ?? 0;

  return {
    courseGroupName: trimmedGroupName,
    mainEducationStartDate,
    foundation,
    main,
    publishedAssignmentCount,
    submittedCount,
    submissionRatePercent:
      publishedAssignmentCount > 0
        ? Math.round((submittedCount / publishedAssignmentCount) * 100)
        : 0,
    hasUnpublishedAssignments:
      allAssignments.length > 0 && publishedAssignments.length === 0,
  };
}
