import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGACY_GROUPS } from "@/lib/constants";
import { isAbortError } from "@/lib/errors/is-abort-error";
import { classifyExtraFieldCategory } from "@/lib/evaluation/classify-extra-field";
import {
  evaluationStatusToScore,
  resolveHomeworkScorePhase,
} from "@/lib/evaluation/scoring";

/** 상담 모달 등에서 보여줄 학생별 성적 요약 */
export type StudentEvaluationSummary = {
  homeworkScore: number;
  examScore: number;
  projectScore: number;
  homeworkAssignmentCount: number;
  examFieldCount: number;
  projectFieldCount: number;
};

const EMPTY_SUMMARY: StudentEvaluationSummary = {
  homeworkScore: 0,
  examScore: 0,
  projectScore: 0,
  homeworkAssignmentCount: 0,
  examFieldCount: 0,
  projectFieldCount: 0,
};

type ExtraFieldRow = {
  id: string;
  title: string;
};

type AssignmentForScoring = {
  id: string;
  start_date: string;
};

/** 과정(그룹)에 해당하는 과제 목록 */
async function fetchAssignmentsForGroup(
  supabase: SupabaseClient,
  groupName: string | null,
): Promise<AssignmentForScoring[]> {
  let query = supabase.from("assignments").select("id, start_date");

  if (groupName) {
    if (LEGACY_GROUPS.includes(groupName as (typeof LEGACY_GROUPS)[number])) {
      const escaped = groupName.replace(/"/g, '""');
      query = query.or(`group_name.is.null,group_name.eq."${escaped}"`);
    } else {
      query = query.eq("group_name", groupName);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("과제 목록 조회 실패:", error);
    return [];
  }

  return (data ?? []) as AssignmentForScoring[];
}

/** 본교육 시작일 — 과제별 기초/본 점수 구간 판별 */
async function fetchMainEducationStartDate(
  supabase: SupabaseClient,
  groupName: string | null,
): Promise<string | null> {
  if (!groupName) return null;

  const { data, error } = await supabase
    .from("training_courses")
    .select("main_education_start_date")
    .eq("name", groupName)
    .maybeSingle();

  if (error) {
    console.error("본교육 시작일 조회 실패:", error);
    return null;
  }

  return data?.main_education_start_date ?? null;
}

/** 과정에 맞는 추가 평가 필드 (시험·프로젝트 등) */
async function fetchExtraFieldsForGroup(
  supabase: SupabaseClient,
  groupName: string | null,
): Promise<ExtraFieldRow[]> {
  let query = supabase
    .from("evaluation_extra_fields")
    .select("id, title")
    .order("sort_order", { ascending: true });

  if (groupName) {
    const escaped = groupName.replace(/"/g, '""');
    query = query.or(`group_name.is.null,group_name.eq."${escaped}"`);
  } else {
    query = query.is("group_name", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("추가 평가 필드 조회 실패:", error);
    return [];
  }

  return (data ?? []) as ExtraFieldRow[];
}

/**
 * 학생 1명의 시험·프로젝트·과제 점수 합계 (평가 그리드와 동일 산식)
 * - 과제: 해당 과정 과제별 제출 상태 점수 합
 * - 시험/프로젝트: 추가 필드 제목에 '시험'·'프로젝트' 포함 여부로 분류
 */
export async function fetchStudentEvaluationSummary(
  supabase: SupabaseClient,
  studentId: string,
  groupName: string | null,
): Promise<StudentEvaluationSummary> {
  if (!studentId) return EMPTY_SUMMARY;

  try {
    const [assignments, extraFields, mainEducationStartDate] = await Promise.all([
      fetchAssignmentsForGroup(supabase, groupName),
      fetchExtraFieldsForGroup(supabase, groupName),
      fetchMainEducationStartDate(supabase, groupName),
    ]);

    let homeworkScore = 0;
    const homeworkAssignmentCount = assignments.length;
    const assignmentIds = assignments.map((row) => row.id);

    if (assignmentIds.length > 0) {
      const { data: homeworkRows, error: homeworkError } = await supabase
        .from("homeworks")
        .select("assignment_id, status")
        .eq("user_id", studentId)
        .in("assignment_id", assignmentIds);

      if (homeworkError) {
        console.error("과제 제출 점수 조회 실패:", homeworkError);
      } else {
        const statusByAssignmentId = new Map<string, string>();
        for (const row of homeworkRows ?? []) {
          statusByAssignmentId.set(row.assignment_id, row.status);
        }

        for (const assignment of assignments) {
          const phase = resolveHomeworkScorePhase(
            assignment.start_date,
            mainEducationStartDate,
          );
          const status = statusByAssignmentId.get(assignment.id);
          homeworkScore += evaluationStatusToScore(status, phase);
        }
      }
    }

    const examFieldIds: string[] = [];
    const projectFieldIds: string[] = [];

    for (const field of extraFields) {
      const category = classifyExtraFieldCategory(field.title);
      if (category === "exam") examFieldIds.push(field.id);
      if (category === "project") projectFieldIds.push(field.id);
    }

    const allExtraFieldIds = [...examFieldIds, ...projectFieldIds];
    let examScore = 0;
    let projectScore = 0;

    if (allExtraFieldIds.length > 0) {
      const { data: scoreRows, error: scoreError } = await supabase
        .from("evaluation_extra_scores")
        .select("field_id, score")
        .eq("user_id", studentId)
        .in("field_id", allExtraFieldIds);

      if (scoreError) {
        console.error("추가 평가 점수 조회 실패:", scoreError);
      } else {
        const scoreByFieldId = new Map<string, number>();
        for (const row of scoreRows ?? []) {
          scoreByFieldId.set(row.field_id, row.score ?? 0);
        }

        for (const fieldId of examFieldIds) {
          examScore += scoreByFieldId.get(fieldId) ?? 0;
        }
        for (const fieldId of projectFieldIds) {
          projectScore += scoreByFieldId.get(fieldId) ?? 0;
        }
      }
    }

    return {
      homeworkScore,
      examScore,
      projectScore,
      homeworkAssignmentCount,
      examFieldCount: examFieldIds.length,
      projectFieldCount: projectFieldIds.length,
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    console.error("학생 성적 요약 조회 중 오류:", error);
    return EMPTY_SUMMARY;
  }
}
