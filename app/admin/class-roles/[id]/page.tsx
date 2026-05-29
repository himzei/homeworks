import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  CLASS_OFFICER_ROLE,
  fetchClassRoleStudents,
} from "@/lib/class-officers";
import {
  toClassRoleSnapshotDetail,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import { extractCourseShortLabel } from "@/lib/courses";
import {
  normalizeGithubUrl,
  type TeamMemberEvaluation,
} from "@/lib/class-role-team-projects";
import { Button } from "@/app/_components/ui/button";

import ApplyClassRoleSnapshotButton from "../../_components/ApplyClassRoleSnapshotButton";
import ProjectEvaluationDateEditor from "../../_components/ProjectEvaluationDateEditor";
import ProjectEvaluationExportButtons, {
  type ProjectEvaluationExportRow,
} from "../../_components/ProjectEvaluationExportButtons";
import ClassRoleSnapshotDetailArticle, {
  type ClassRoleSnapshotTeam,
} from "../../_components/ClassRoleSnapshotDetailArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function computeEvaluationTotal(evaluation: TeamMemberEvaluation): number {
  return (
    evaluation.topic +
    evaluation.responsibility +
    evaluation.dataAnalysis +
    evaluation.resultQuality +
    evaluation.explanation
  );
}

function computeEvaluationGrade(total: number): string {
  // 한글 주석: 페이지 표시에 필요한 단순 등급
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "F";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_role_snapshots")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data?.title ? `${data.title} · 반·조` : "반·조 상세",
  };
}

/**
 * 관리자 - 반·조 게시판 상세
 */
export default async function AdminClassRoleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const selectedGroupParam = (queryParams?.group as string) || null;
  const filterGroup =
    selectedGroupParam && selectedGroupParam !== "all"
      ? selectedGroupParam
      : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  const { data: record, error } = await supabase
    .from("class_role_snapshots")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !record) {
    notFound();
  }

  const snapshot = toClassRoleSnapshotDetail(
    record as ClassRoleSnapshotRecord,
  );

  const students = await fetchClassRoleStudents(supabase, snapshot.groupName);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const honorBadgeLabelsByProfileId = await fetchHonorBadgeLabelsByProfileId(
    supabase,
    students.map((s) => s.id),
  );

  const cohortLabel = extractCourseShortLabel(snapshot.groupName);

  const teams: ClassRoleSnapshotTeam[] = Array.from(
    { length: snapshot.teamCount },
    (_, index) => {
      const teamNumber = index + 1;
      const leaderId = snapshot.teamLeaders[teamNumber];
      const leader = leaderId ? studentById.get(leaderId) : null;
      const memberIds = snapshot.teamMembers[teamNumber] ?? [];

      const members = memberIds
        .filter((memberId) => memberId !== leaderId)
        .map((memberId) => {
          const student = studentById.get(memberId);
          const isPresident = memberId === snapshot.classPresidentId;
          return {
            name: student?.name ?? "(알 수 없음)",
            classOfficerRole: isPresident
              ? CLASS_OFFICER_ROLE.CLASS_PRESIDENT
              : null,
            teamNumber,
            honorBadgeLabels: honorBadgeLabelsByProfileId[memberId] ?? [],
          };
        });

      const leaderIsPresident = leaderId === snapshot.classPresidentId;

      return {
        teamNumber,
        leaderName: leader?.name ?? (leaderId ? "(알 수 없음)" : null),
        leaderRole: leaderIsPresident
          ? CLASS_OFFICER_ROLE.CLASS_PRESIDENT
          : leader
            ? CLASS_OFFICER_ROLE.TEAM_LEADER
            : null,
        leaderIsTeamLeader: leaderIsPresident,
        leaderHonorBadgeLabels: leaderId
          ? (honorBadgeLabelsByProfileId[leaderId] ?? [])
          : [],
        members,
        teamProject: snapshot.teamProjects[teamNumber] ?? null,
      };
    },
  );

  const evaluationTeams = Array.from({ length: snapshot.teamCount }, (_, index) => {
    const teamNumber = index + 1;
    const leaderId = snapshot.teamLeaders[teamNumber] ?? null;
    const memberIds = snapshot.teamMembers[teamNumber] ?? [];
    const orderedMemberIds = [
      ...(leaderId ? [leaderId] : []),
      ...memberIds.filter((id) => id !== leaderId),
    ];

    const teamProject = snapshot.teamProjects[teamNumber] ?? null;
    const evaluations = teamProject?.evaluations ?? {};
    const topicLabel = teamProject?.topic?.trim() || "";
    const projectUrl = teamProject?.githubUrl?.trim() || "";

    const memberRows = orderedMemberIds.map((profileId) => {
      const student = studentById.get(profileId);
      const name = student?.name ?? "(알 수 없음)";
      const evaluation = evaluations[profileId] ?? null;
      const total = evaluation ? computeEvaluationTotal(evaluation) : null;
      const grade = total !== null ? computeEvaluationGrade(total) : null;
      return {
        profileId,
        name,
        isLeader: leaderId === profileId,
        workAssignment: evaluation?.workAssignment?.trim() || "",
        topic: evaluation?.topic ?? null,
        responsibility: evaluation?.responsibility ?? null,
        dataAnalysis: evaluation?.dataAnalysis ?? null,
        resultQuality: evaluation?.resultQuality ?? null,
        explanation: evaluation?.explanation ?? null,
        total,
        grade,
        feedback: evaluation?.feedback?.trim() || "",
      };
    });

    const scoredTotals = memberRows
      .map((row) => row.total)
      .filter((value): value is number => typeof value === "number");
    const average =
      scoredTotals.length > 0
        ? Math.round(
            (scoredTotals.reduce((sum, v) => sum + v, 0) / scoredTotals.length) *
              10,
          ) / 10
        : null;

    return {
      teamNumber,
      topicLabel,
      projectUrl,
      memberRows,
      average,
      scoredCount: scoredTotals.length,
      memberCount: memberRows.length,
    };
  }).filter((team) => team.memberCount > 0);

  const exportRows: ProjectEvaluationExportRow[] = evaluationTeams.flatMap((team) =>
    team.memberRows.map((row) => ({
      teamNumber: team.teamNumber,
      profileId: row.profileId,
      name: row.name,
      roleLabel: row.isLeader ? "조장" : "조원",
      workAssignment: row.workAssignment,
      topic: row.topic,
      responsibility: row.responsibility,
      dataAnalysis: row.dataAnalysis,
      resultQuality: row.resultQuality,
      explanation: row.explanation,
      total: row.total,
      grade: row.grade,
      feedback: row.feedback,
    })),
  );

  const listHref = filterGroup
    ? `/admin/class-roles?group=${encodeURIComponent(filterGroup)}`
    : `/admin/class-roles?group=${encodeURIComponent(snapshot.groupName)}`;

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : `?group=${encodeURIComponent(snapshot.groupName)}`;

  const editHref = `/admin/class-roles/${id}/edit${groupQuery}`;

  const createdAtLabel = dateFormatter.format(new Date(snapshot.createdAt));
  const evaluationDateSource =
    snapshot.projectEvaluationDate?.trim() || snapshot.updatedAt;
  const evaluationDateLabel = dateFormatter.format(new Date(evaluationDateSource));

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href={listHref}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            목록
          </Button>
        </Link>
        {!snapshot.isActive ? (
          <ApplyClassRoleSnapshotButton
            snapshotId={id}
            title={snapshot.title}
          />
        ) : null}
        <Link href={editHref}>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <PencilLine className="size-4" />
            수정
          </Button>
        </Link>
      </div>

      <ClassRoleSnapshotDetailArticle
          snapshotId={id}
          title={snapshot.title}
          cohortLabel={cohortLabel}
          groupName={snapshot.groupName}
          createdAtLabel={createdAtLabel}
          createdAtIso={snapshot.createdAt}
          isActive={snapshot.isActive}
          teamCount={snapshot.teamCount}
          teams={teams}
          initialTeamProjects={snapshot.teamProjects}
        />

      {/* 조별 평가 취합 (요청: 하단 배치 + 기본 접힘) */}
      <details className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-indigo-50/60 dark:bg-indigo-950/20 overflow-hidden">
        <summary className="list-none cursor-pointer px-4 sm:px-6 py-4 select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                프로젝트 평가
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                클릭하여 펼치기 · 조별 상세에서 입력한 점수(총점/등급/업무 분장/피드백)를 조 단위로 모아 표시합니다.
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                평가일 {evaluationDateLabel}
              </p>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
              기본 접힘
            </span>
          </div>
        </summary>

        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-5 space-y-4">
          <ProjectEvaluationExportButtons
            title={snapshot.title}
            cohortLabel={cohortLabel}
            evaluationDateLabel={evaluationDateSource.slice(0, 10)}
            rows={exportRows}
          >
            <ProjectEvaluationDateEditor
              snapshotId={id}
              initialDate={snapshot.projectEvaluationDate}
            />
            {evaluationTeams.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                아직 평가할 팀이 없습니다.
              </p>
            ) : (
              evaluationTeams.map((team) => (
                <div
                  key={team.teamNumber}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <span>
                        {cohortLabel} {team.teamNumber}조
                      </span>
                      {team.topicLabel ? (
                        <span className="ml-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          · {team.topicLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {team.scoredCount}/{team.memberCount}명 평가됨
                      {team.average !== null ? ` · 평균 ${team.average}점` : ""}
                    </div>
                  </div>

                  <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs">
                    <span className="font-medium text-zinc-500 dark:text-zinc-400">
                      프로젝트 주소
                    </span>
                    {team.projectUrl ? (
                      <a
                        href={normalizeGithubUrl(team.projectUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {team.projectUrl}
                      </a>
                    ) : (
                      <span className="ml-2 text-zinc-400">(미입력)</span>
                    )}
                  </div>

                  <div className="overflow-x-auto" data-export-scroll-x>
                    <table className="min-w-[1180px] w-full text-xs">
                      <thead className="bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300">
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="px-3 py-2 text-left w-[160px]">
                            이름
                          </th>
                          <th className="px-3 py-2 text-left w-[220px]">
                            업무 분장
                          </th>
                          <th className="px-3 py-2 text-center w-[80px]">
                            주제
                          </th>
                          <th className="px-3 py-2 text-center w-[110px]">
                            업무분장점수
                          </th>
                          <th className="px-3 py-2 text-center w-[90px]">
                            데이터분석
                          </th>
                          <th className="px-3 py-2 text-center w-[90px]">
                            결과도출
                          </th>
                          <th className="px-3 py-2 text-center w-[80px]">
                            설명력
                          </th>
                          <th className="px-3 py-2 text-center w-[90px]">
                            총점(100)
                          </th>
                          <th className="px-3 py-2 text-center w-[70px]">
                            등급
                          </th>
                          <th className="px-3 py-2 text-left w-[320px]">
                            보완 및 피드백
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-zinc-950">
                        {team.memberRows.map((row) => (
                          <tr
                            key={row.profileId}
                            className="border-b last:border-b-0 border-zinc-100 dark:border-zinc-900"
                          >
                            <td className="px-3 py-2">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {row.name}
                              </div>
                              <div className="text-[11px] text-zinc-400">
                                {row.isLeader ? "조장" : "조원"}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200">
                              {row.workAssignment || (
                                <span className="text-zinc-400">
                                  (미입력)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-zinc-800 dark:text-zinc-200">
                              {row.topic ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center text-zinc-800 dark:text-zinc-200">
                              {row.responsibility ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center text-zinc-800 dark:text-zinc-200">
                              {row.dataAnalysis ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center text-zinc-800 dark:text-zinc-200">
                              {row.resultQuality ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center text-zinc-800 dark:text-zinc-200">
                              {row.explanation ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                              {row.total !== null ? row.total : "-"}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-zinc-700 dark:text-zinc-200">
                              {row.grade ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap wrap-break-word">
                              {row.feedback || (
                                <span className="text-zinc-400">
                                  (미입력)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </ProjectEvaluationExportButtons>
        </div>
      </details>
    </>
  );
}
