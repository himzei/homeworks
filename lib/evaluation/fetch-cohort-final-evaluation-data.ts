import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGACY_GROUPS } from "@/lib/constants";
import { classifyExtraFieldCategory } from "@/lib/evaluation/classify-extra-field";
import { classifyExamEducationPhase } from "@/lib/evaluation/classify-exam-education-phase";
import {
  evaluationStatusToScore,
  resolveHomeworkScorePhase,
  type HomeworkScorePhase,
} from "@/lib/evaluation/scoring";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";
import {
  teamEvaluationToScoreDetails,
  type ProjectScoreDetail,
} from "@/lib/evaluation/team-project-criteria";
import { parseTeamLeadersFromJson } from "@/lib/apply-class-roles";
import {
  parseTeamProjectsFromJson,
  type TeamMemberEvaluation,
} from "@/lib/class-role-team-projects";

/** 과제 1건 — 날짜·제목·점수 (과제평가 전용) */
export type HomeworkEvaluationItem = {
  assignmentId: string;
  title: string;
  dateLabel: string;
  score: number;
  phase: HomeworkScorePhase;
  phaseLabel: string;
};

/** 과제평가 (사전·본교육과 별도) */
export type StudentHomeworkEvaluation = {
  totalScore: number;
  items: HomeworkEvaluationItem[];
};

/** 날짜 열 + 가로 점수 표 (과제·기초과정 공통) */
export type DatedScoreItem = {
  key: string;
  dateLabel: string;
  title: string;
  score: number;
};

export type StudentDatedScoreEvaluation = {
  totalScore: number;
  items: DatedScoreItem[];
};

/** 자동 집계 점수 (제출물·시험·프로젝트 평가와 동일 기준) */
export type StudentFinalEvaluationMetrics = {
  /** 사전교육 시험 합계 */
  preEducationScore: number;
  /** 본교육 시험 합계 */
  mainEducationScore: number;
  projectScore: number;
  preEducationDetail: string;
  mainEducationDetail: string;
  projectDetail: string;
  /** 과제평가 — 과제별 날짜·점수 */
  homework: StudentHomeworkEvaluation;
  /** 기초과정 평가 — 기초 과제 + 사전 시험 (날짜별 가로 표) */
  foundation: StudentDatedScoreEvaluation;
  /** 시험 평가 — 추가 평가 필드(본교육 시험), 과제평가 아래 표시 */
  exam: StudentDatedScoreEvaluation;
  /** 프로젝트 평가 — 추가 필드 + 팀 프로젝트(세부 점수) */
  project: StudentProjectEvaluation;
};

/** 프로젝트 평가 1항목 */
export type ProjectEvaluationItem = {
  key: string;
  dateLabel: string;
  title: string;
  totalScore: number;
  /** 팀 프로젝트만 5항목 세부 점수, 추가 필드는 비어 있음 */
  details: ProjectScoreDetail[];
  /** 팀 프로젝트: 조장 또는 조원 */
  teamRoleLabel?: string;
  /** 팀 프로젝트: 업무 분장(역할) */
  workAssignment?: string;
};

export type StudentProjectEvaluation = {
  totalScore: number;
  items: ProjectEvaluationItem[];
};

/** 학생별 팀 프로젝트 평가 1건 */
type TeamProjectStudentEntry = {
  teamNumber: number;
  dateLabel: string;
  title: string;
  totalScore: number;
  details: ProjectScoreDetail[];
  teamRoleLabel: string;
  workAssignment: string;
};

export type ConsultationLogPreview = {
  id: string;
  consultationDate: string;
  content: string;
  notes: string | null;
};

/** 학생 1명 최종 평가 화면용 데이터 */
export type StudentFinalEvaluationRow = {
  studentId: string;
  studentName: string;
  metrics: StudentFinalEvaluationMetrics;
  consultationLogs: ConsultationLogPreview[];
  /** 상담일지 자동 요약(저장 전 미리보기) */
  consultationAutoSummary: string;
  consultationSummary: string;
  professorFinalEvaluation: string;
  savedUpdatedAt: string | null;
};

type GroupStudent = { id: string; name: string };

type AssignmentRow = { id: string; title: string; start_date: string };
type ExtraFieldRow = {
  id: string;
  title: string;
  field_date: string | null;
};

function computeTeamProjectTotal(evaluation: TeamMemberEvaluation): number {
  return (
    evaluation.topic +
    evaluation.responsibility +
    evaluation.dataAnalysis +
    evaluation.resultQuality +
    evaluation.explanation
  );
}

/** 기수 학생 목록 (레거시 기수는 group_name null 포함) */
async function fetchGroupStudents(
  supabase: SupabaseClient,
  groupName: string,
): Promise<GroupStudent[]> {
  let query = supabase
    .from("profiles")
    .select("id, name")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
    .eq("is_dormant", false)
    .order("name", { ascending: true });

  if (LEGACY_GROUPS.includes(groupName as (typeof LEGACY_GROUPS)[number])) {
    const escaped = groupName.replace(/"/g, '""');
    query = query.or(`group_name.eq."${escaped}",group_name.is.null`);
  } else {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;
  if (error) {
    console.error("최종 평가 학생 목록 조회 실패:", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const name = (row.name ?? "").trim();
    if (!name || !row.id) return [];
    return [{ id: row.id, name }];
  });
}

async function fetchAssignmentsForGroup(
  supabase: SupabaseClient,
  groupName: string,
): Promise<AssignmentRow[]> {
  let query = supabase
    .from("assignments")
    .select("id, title, start_date")
    .order("start_date", { ascending: true });

  if (LEGACY_GROUPS.includes(groupName as (typeof LEGACY_GROUPS)[number])) {
    const escaped = groupName.replace(/"/g, '""');
    query = query.or(`group_name.is.null,group_name.eq."${escaped}"`);
  } else {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;
  if (error) {
    console.error("최종 평가 과제 목록 조회 실패:", error);
    return [];
  }
  return (data ?? []) as AssignmentRow[];
}

function formatAssignmentDateLabel(startDate: string): string {
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) return startDate.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(parsed);
}

function phaseToLabel(phase: HomeworkScorePhase): string {
  return phase === "foundation" ? "기초(사전)" : "본과정";
}

function buildHomeworkItemsForStudent(
  assignments: AssignmentRow[],
  mainEducationStartDate: string | null,
  studentId: string,
  homeworkStatusByUserAssignment: Map<string, string>,
): HomeworkEvaluationItem[] {
  return assignments.map((assignment) => {
    const phase = resolveHomeworkScorePhase(
      assignment.start_date,
      mainEducationStartDate,
    );
    const status = homeworkStatusByUserAssignment.get(
      `${studentId}:${assignment.id}`,
    );
    const score = evaluationStatusToScore(status, phase);

    return {
      assignmentId: assignment.id,
      title: (assignment.title ?? "").trim() || "(제목 없음)",
      dateLabel: formatAssignmentDateLabel(assignment.start_date),
      score,
      phase,
      phaseLabel: phaseToLabel(phase),
    };
  });
}

/** 과제평가 — 본과정 과제만 (기초과정은 기초과정 평가 섹션) */
function buildHomeworkEvaluationForStudent(
  assignments: AssignmentRow[],
  mainEducationStartDate: string | null,
  studentId: string,
  homeworkStatusByUserAssignment: Map<string, string>,
): StudentHomeworkEvaluation {
  const items = buildHomeworkItemsForStudent(
    assignments,
    mainEducationStartDate,
    studentId,
    homeworkStatusByUserAssignment,
  ).filter((item) => item.phase === "main");

  const totalScore = items.reduce((sum, item) => sum + item.score, 0);
  return { totalScore, items };
}

function formatExtraFieldDateLabel(fieldDate: string | null): string {
  const trimmed = fieldDate?.trim().slice(0, 10);
  return trimmed && trimmed.length > 0 ? trimmed : "날짜미정";
}

function sortDatedScoreItems(items: DatedScoreItem[]): DatedScoreItem[] {
  return [...items].sort((a, b) => {
    if (a.dateLabel === "날짜미정" && b.dateLabel !== "날짜미정") return 1;
    if (b.dateLabel === "날짜미정" && a.dateLabel !== "날짜미정") return -1;
    return a.dateLabel.localeCompare(b.dateLabel);
  });
}

/** 추가 평가 필드(시험) — 날짜·제목·점수 가로 표 */
function buildExtraExamEvaluationForStudent(
  examFields: ExtraFieldRow[],
  studentId: string,
  extraScoreByUserField: Map<string, number>,
): StudentDatedScoreEvaluation {
  const items = sortDatedScoreItems(
    examFields.map((field) => ({
      key: `exam-${field.id}`,
      dateLabel: formatExtraFieldDateLabel(field.field_date),
      title: (field.title ?? "").trim() || "시험",
      score: extraScoreByUserField.get(`${studentId}:${field.id}`) ?? 0,
    })),
  );
  const totalScore = items.reduce((sum, item) => sum + item.score, 0);
  return { totalScore, items };
}

/** 기초과정: 기초(사전) 과제 + 사전교육 시험 */
function buildFoundationEvaluationForStudent(
  assignments: AssignmentRow[],
  mainEducationStartDate: string | null,
  studentId: string,
  homeworkStatusByUserAssignment: Map<string, string>,
  preExamFields: ExtraFieldRow[],
  extraScoreByUserField: Map<string, number>,
): StudentDatedScoreEvaluation {
  const items: DatedScoreItem[] = [];

  for (const item of buildHomeworkItemsForStudent(
    assignments,
    mainEducationStartDate,
    studentId,
    homeworkStatusByUserAssignment,
  )) {
    if (item.phase !== "foundation") continue;
    items.push({
      key: `hw-${item.assignmentId}`,
      dateLabel: item.dateLabel,
      title: item.title,
      score: item.score,
    });
  }

  const preExamItems = buildExtraExamEvaluationForStudent(
    preExamFields,
    studentId,
    extraScoreByUserField,
  ).items;
  items.push(...preExamItems);

  const sorted = sortDatedScoreItems(items);
  const totalScore = sorted.reduce((sum, item) => sum + item.score, 0);
  return { totalScore, items: sorted };
}

async function fetchExtraFieldsForGroup(
  supabase: SupabaseClient,
  groupName: string,
): Promise<ExtraFieldRow[]> {
  const escaped = groupName.replace(/"/g, '""');
  const { data, error } = await supabase
    .from("evaluation_extra_fields")
    .select("id, title, field_date")
    .or(`group_name.is.null,group_name.eq."${escaped}"`)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("최종 평가 추가 필드 조회 실패:", error);
    return [];
  }
  return (data ?? []) as ExtraFieldRow[];
}

async function fetchMainEducationStartDate(
  supabase: SupabaseClient,
  groupName: string,
): Promise<string | null> {
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

/** 활성 반·조 스냅샷 — 학생별 팀 프로젝트 평가(세부 점수 포함) */
async function fetchTeamProjectEntriesByStudent(
  supabase: SupabaseClient,
  groupName: string,
): Promise<Map<string, TeamProjectStudentEntry[]>> {
  const result = new Map<string, TeamProjectStudentEntry[]>();

  const { data, error } = await supabase
    .from("class_role_snapshots")
    .select(
      "team_projects, project_evaluation_date, team_leaders, team_count",
    )
    .eq("group_name", groupName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("팀 프로젝트 평가 조회 실패:", error);
    return result;
  }
  if (!data?.team_projects) return result;

  const teamCount =
    typeof data.team_count === "number" && data.team_count > 0
      ? data.team_count
      : 12;

  const teamLeaders = parseTeamLeadersFromJson(
    data.team_leaders ?? {},
    teamCount,
  );

  const evaluationDateLabel = data.project_evaluation_date?.trim()
    ? data.project_evaluation_date.trim().slice(0, 10)
    : "날짜미정";

  const teamProjects = parseTeamProjectsFromJson(data.team_projects);
  for (const [teamKey, project] of Object.entries(teamProjects)) {
    const teamNumber = Number.parseInt(teamKey, 10);
    if (!Number.isFinite(teamNumber)) continue;

    const title =
      project.topic?.trim() || `${teamNumber}조 팀프로젝트`;

    const leaderId = teamLeaders.get(teamNumber) ?? null;

    for (const [profileId, evaluation] of Object.entries(project.evaluations)) {
      if (!profileId) continue;

      const teamRoleLabel = leaderId === profileId ? "조장" : "조원";

      const entry: TeamProjectStudentEntry = {
        teamNumber,
        dateLabel: evaluationDateLabel,
        title,
        totalScore: computeTeamProjectTotal(evaluation),
        details: teamEvaluationToScoreDetails(evaluation),
        teamRoleLabel,
        workAssignment: evaluation.workAssignment?.trim() ?? "",
      };
      const list = result.get(profileId) ?? [];
      list.push(entry);
      result.set(profileId, list);
    }
  }

  for (const list of result.values()) {
    list.sort((a, b) => a.teamNumber - b.teamNumber);
  }

  return result;
}

function buildProjectEvaluationForStudent(
  projectFields: ExtraFieldRow[],
  teamEntries: TeamProjectStudentEntry[],
  studentId: string,
  extraScoreByUserField: Map<string, number>,
): StudentProjectEvaluation {
  const items: ProjectEvaluationItem[] = [];

  for (const field of projectFields) {
    const score =
      extraScoreByUserField.get(`${studentId}:${field.id}`) ?? 0;
    items.push({
      key: `extra-${field.id}`,
      dateLabel: formatExtraFieldDateLabel(field.field_date),
      title: (field.title ?? "").trim() || "프로젝트",
      totalScore: score,
      details: [],
    });
  }

  for (const entry of teamEntries) {
    items.push({
      key: `team-${entry.teamNumber}`,
      dateLabel: entry.dateLabel,
      title: entry.title,
      totalScore: entry.totalScore,
      details: entry.details,
      teamRoleLabel: entry.teamRoleLabel,
      workAssignment: entry.workAssignment,
    });
  }

  const sorted = sortDatedScoreItems(
    items.map((item) => ({
      key: item.key,
      dateLabel: item.dateLabel,
      title: item.title,
      score: item.totalScore,
    })),
  ).map((sortedItem) => {
    const source = items.find((item) => item.key === sortedItem.key);
    return source!;
  });

  const totalScore = sorted.reduce((sum, item) => sum + item.totalScore, 0);
  return { totalScore, items: sorted };
}

function formatConsultationAutoSummary(
  logs: ConsultationLogPreview[],
): string {
  if (logs.length === 0) return "";

  return logs
    .map((log) => {
      const dateLabel = log.consultationDate.slice(0, 10);
      const body = log.content.trim();
      const note = log.notes?.trim();
      const lines = [`[${dateLabel}] ${body}`];
      if (note) lines.push(`  (메모) ${note}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * 기수 전체 학생 최종 평가 데이터 (자동 점수 + 상담 + 저장된 교수 평가)
 */
export async function fetchCohortFinalEvaluationData(
  supabase: SupabaseClient,
  groupName: string,
): Promise<StudentFinalEvaluationRow[]> {
  const trimmedGroup = groupName.trim();
  if (!trimmedGroup) return [];

  const students = await fetchGroupStudents(supabase, trimmedGroup);
  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);

  const [
    assignments,
    extraFields,
    mainEducationStartDate,
    teamProjectEntriesByStudent,
  ] = await Promise.all([
    fetchAssignmentsForGroup(supabase, trimmedGroup),
    fetchExtraFieldsForGroup(supabase, trimmedGroup),
    fetchMainEducationStartDate(supabase, trimmedGroup),
    fetchTeamProjectEntriesByStudent(supabase, trimmedGroup),
  ]);

  const examAndProjectFieldIds = extraFields
    .filter((field) => {
      const category = classifyExtraFieldCategory(field.title);
      return category === "exam" || category === "project";
    })
    .map((field) => field.id);

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [
    savedRowsResult,
    homeworkRowsResult,
    extraScoreRowsResult,
    consultationRowsResult,
  ] = await Promise.all([
    supabase
      .from("student_final_evaluations")
      .select(
        "student_id, consultation_summary, professor_final_evaluation, updated_at",
      )
      .eq("group_name", trimmedGroup)
      .in("student_id", studentIds),
    assignmentIds.length > 0
      ? supabase
          .from("homeworks")
          .select("user_id, assignment_id, status")
          .in("assignment_id", assignmentIds)
          .in("user_id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    examAndProjectFieldIds.length > 0
      ? supabase
          .from("evaluation_extra_scores")
          .select("user_id, field_id, score")
          .in("field_id", examAndProjectFieldIds)
          .in("user_id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("consultation_logs")
      .select("id, student_id, consultation_date, content, notes")
      .in("student_id", studentIds)
      .order("consultation_date", { ascending: false }),
  ]);

  if (savedRowsResult.error) {
    console.error("저장된 최종 평가 조회 실패:", savedRowsResult.error);
  }
  if (homeworkRowsResult.error) {
    console.error("과제 제출 조회 실패:", homeworkRowsResult.error);
  }
  if (extraScoreRowsResult.error) {
    console.error("추가 평가 점수 조회 실패:", extraScoreRowsResult.error);
  }
  if (consultationRowsResult.error) {
    console.error("상담일지 조회 실패:", consultationRowsResult.error);
  }

  const savedByStudentId = new Map<
    string,
    {
      consultationSummary: string;
      professorFinalEvaluation: string;
      updatedAt: string | null;
    }
  >();
  for (const row of savedRowsResult.data ?? []) {
    savedByStudentId.set(row.student_id, {
      consultationSummary: row.consultation_summary?.trim() ?? "",
      professorFinalEvaluation: row.professor_final_evaluation?.trim() ?? "",
      updatedAt: row.updated_at ?? null,
    });
  }

  const homeworkStatusByUserAssignment = new Map<string, string>();
  for (const row of homeworkRowsResult.data ?? []) {
    homeworkStatusByUserAssignment.set(
      `${row.user_id}:${row.assignment_id}`,
      row.status,
    );
  }

  const extraScoreByUserField = new Map<string, number>();
  for (const row of extraScoreRowsResult.data ?? []) {
    extraScoreByUserField.set(
      `${row.user_id}:${row.field_id}`,
      row.score ?? 0,
    );
  }

  const consultationsByStudent = new Map<string, ConsultationLogPreview[]>();
  for (const row of consultationRowsResult.data ?? []) {
    const list = consultationsByStudent.get(row.student_id) ?? [];
    list.push({
      id: row.id,
      consultationDate: row.consultation_date,
      content: row.content ?? "",
      notes: row.notes ?? null,
    });
    consultationsByStudent.set(row.student_id, list);
  }

  const preExamFields: ExtraFieldRow[] = [];
  const mainExamFields: ExtraFieldRow[] = [];
  const projectFields: ExtraFieldRow[] = [];

  for (const field of extraFields) {
    const category = classifyExtraFieldCategory(field.title);
    if (category === "exam") {
      const phase = classifyExamEducationPhase(
        field.title,
        field.field_date,
        mainEducationStartDate,
      );
      if (phase === "pre") preExamFields.push(field);
      else mainExamFields.push(field);
    } else if (category === "project") {
      projectFields.push(field);
    }
  }

  return students.map((student) => {
    const homework = buildHomeworkEvaluationForStudent(
      assignments,
      mainEducationStartDate,
      student.id,
      homeworkStatusByUserAssignment,
    );

    const foundation = buildFoundationEvaluationForStudent(
      assignments,
      mainEducationStartDate,
      student.id,
      homeworkStatusByUserAssignment,
      preExamFields,
      extraScoreByUserField,
    );
    const exam = buildExtraExamEvaluationForStudent(
      mainExamFields,
      student.id,
      extraScoreByUserField,
    );

    const project = buildProjectEvaluationForStudent(
      projectFields,
      teamProjectEntriesByStudent.get(student.id) ?? [],
      student.id,
      extraScoreByUserField,
    );

    const preEducationScore = foundation.totalScore;
    const mainEducationScore = exam.totalScore;
    const projectScore = project.totalScore;

    const foundationHomeworkCount = assignments.filter(
      (assignment) =>
        resolveHomeworkScorePhase(
          assignment.start_date,
          mainEducationStartDate,
        ) === "foundation",
    ).length;

    const metrics: StudentFinalEvaluationMetrics = {
      preEducationScore,
      mainEducationScore,
      projectScore,
      preEducationDetail:
        foundation.items.length > 0
          ? `기초과제 ${foundationHomeworkCount}건 + 사전 시험 ${preExamFields.length}건`
          : "기초과정 항목 없음",
      mainEducationDetail:
        exam.items.length > 0
          ? `추가 시험 ${exam.totalScore}점 (${exam.items.length}항목)`
          : "추가 시험 항목 없음",
      projectDetail:
        project.items.length > 0
          ? `항목 ${project.items.length}건 (추가필드·팀평가)`
          : "프로젝트 항목 없음",
      homework,
      foundation,
      exam,
      project,
    };

    const consultationLogs = consultationsByStudent.get(student.id) ?? [];
    const consultationAutoSummary =
      formatConsultationAutoSummary(consultationLogs);
    const saved = savedByStudentId.get(student.id);

    return {
      studentId: student.id,
      studentName: student.name,
      metrics,
      consultationLogs,
      consultationAutoSummary,
      consultationSummary:
        saved?.consultationSummary || consultationAutoSummary,
      professorFinalEvaluation: saved?.professorFinalEvaluation ?? "",
      savedUpdatedAt: saved?.updatedAt ?? null,
    };
  });
}
