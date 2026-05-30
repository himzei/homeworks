import Link from "next/link";
import { ExternalLink, History, Users } from "lucide-react";

import LearningStatusTeamProjectAttachmentButton from "@/app/_components/LearningStatusTeamProjectAttachmentButton";
import type {
  LearningStatusMyTeam,
  LearningStatusTeamComposition,
  LearningStatusTeamHistoryEntry,
  LearningStatusTeamMember,
  LearningStatusTeamProject,
} from "@/lib/fetch-learning-status-team-composition";
import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type LearningStatusTeamCompositionProps = {
  composition: LearningStatusTeamComposition;
};

const historyDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 학습현황 — 우리 팀 + (조 변경 시) 히스토리 */
export default function LearningStatusTeamComposition({
  composition,
}: LearningStatusTeamCompositionProps) {
  const {
    courseGroupName,
    cohortLabel,
    isTeamAssignmentActive,
    activeSnapshotTitle,
    myTeam,
    teamHistory,
  } = composition;

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          우리 팀
        </h2>
        {courseGroupName ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {courseGroupName} 기준 · 내가 속한 조와 프로젝트 정보를 표시합니다.
            {activeSnapshotTitle ? ` (${activeSnapshotTitle})` : null}
          </p>
        ) : null}
      </div>

      {!courseGroupName ? (
        <EmptyNotice>
          과정명이 설정되지 않아 팀 정보를 표시할 수 없습니다.{" "}
          <Link href="/profile" className="font-medium underline">
            프로필에서 과정명을 선택
          </Link>
          해 주세요.
        </EmptyNotice>
      ) : !isTeamAssignmentActive ? (
        <EmptyNotice>
          아직 조 편성이 적용되지 않았습니다. 관리자가 조 편성을 게시하면 이곳에
          표시됩니다.
        </EmptyNotice>
      ) : !myTeam ? (
        <EmptyNotice>
          아직 조에 배정되지 않았습니다. 조 편성이 완료되면 이곳에 우리 팀 정보가
          표시됩니다.
        </EmptyNotice>
      ) : (
        <div className="space-y-6">
          <MyTeamPanel
            team={myTeam}
            cohortLabel={cohortLabel ?? courseGroupName}
          />

          {teamHistory.length > 0 ? (
            <TeamHistorySection
              entries={teamHistory}
              cohortLabel={cohortLabel ?? courseGroupName}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {children}
    </div>
  );
}

function MyTeamPanel({
  team,
  cohortLabel,
}: {
  team: LearningStatusMyTeam;
  cohortLabel: string;
}) {
  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-900/60 dark:bg-zinc-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          <Users className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          {cohortLabel} {team.teamNumber}조
        </p>
        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          내 조
        </span>
      </div>

      {team.project ? (
        <TeamProjectBlock project={team.project} team={team} />
      ) : null}
    </div>
  );
}

function TeamHistorySection({
  entries,
  cohortLabel,
}: {
  entries: LearningStatusTeamHistoryEntry[];
  cohortLabel: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <History className="size-4 shrink-0" aria-hidden />
          이전 조 편성
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          조가 변경되기 전, 내가 속했던 팀 기록입니다.
        </p>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <article
            key={entry.snapshotId}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.snapshotTitle}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {cohortLabel} {entry.team.teamNumber}조 ·{" "}
                  {historyDateFormatter.format(new Date(entry.archivedAt))}까지
                  적용
                </p>
              </div>
            </div>

            {entry.team.project ? (
              <TeamProjectBlock
                project={entry.team.project}
                team={entry.team}
                compact
              />
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function WorkAssignmentCard({
  member,
  isLeader,
}: {
  member: LearningStatusTeamMember;
  isLeader: boolean;
}) {
  return (
    <li
      className={cn(
        "min-w-[140px] max-w-[200px] shrink-0 rounded-lg border px-3 py-3 text-sm",
        isLeader
          ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p
          className={cn(
            "font-medium",
            isLeader
              ? "text-violet-900 dark:text-violet-100"
              : "text-zinc-900 dark:text-zinc-100",
          )}
        >
          {member.name}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            isLeader
              ? "bg-violet-200 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          )}
        >
          {isLeader ? "조장" : "조원"}
        </span>
      </div>
      <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">
        {member.workAssignment}
      </p>
    </li>
  );
}

function TeamProjectBlock({
  project,
  team,
  compact = false,
}: {
  project: LearningStatusTeamProject;
  team: LearningStatusMyTeam;
  compact?: boolean;
}) {
  const workAssignmentMembers = [
    ...(team.leader?.workAssignment
      ? [{ member: team.leader, isLeader: true as const }]
      : []),
    ...team.members
      .filter((member) => member.workAssignment)
      .map((member) => ({ member, isLeader: false as const })),
  ];
  const hasWorkAssignments = workAssignmentMembers.length > 0;
  const hasTopic = !!project.topic;
  const hasGithubUrl = !!project.githubUrl;
  const hasEvaluationDate = !!project.projectEvaluationDate;
  const hasAnyProjectInfo =
    hasTopic ||
    hasGithubUrl ||
    hasEvaluationDate ||
    hasWorkAssignments ||
    project.hasPptAttachment;

  if (!hasAnyProjectInfo) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        아직 등록된 프로젝트 정보가 없습니다.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800",
        compact && "pt-3",
      )}
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ProjectInfoItem label="우리 팀 주제">
          {hasTopic ? project.topic : "미입력"}
        </ProjectInfoItem>
        <ProjectInfoItem label="프로젝트 발표일">
          {hasEvaluationDate
            ? formatProjectEvaluationDate(project.projectEvaluationDate!)
            : "미정"}
        </ProjectInfoItem>
        <ProjectInfoItem label="프로젝트 주소" className="sm:col-span-2">
          {hasGithubUrl ? (
            <a
              href={normalizeExternalUrl(project.githubUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-blue-600 hover:underline dark:text-blue-400"
            >
              {project.githubUrl}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
          ) : (
            "미입력"
          )}
        </ProjectInfoItem>
      </dl>

      {hasWorkAssignments ? (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            업무 분장
          </p>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {workAssignmentMembers.map(({ member, isLeader }) => (
              <WorkAssignmentCard
                key={member.id}
                member={member}
                isLeader={isLeader}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {project.hasPptAttachment ? (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            PPT / 첨부파일
          </p>
          <LearningStatusTeamProjectAttachmentButton
            snapshotId={project.snapshotId}
            teamNumber={project.teamNumber}
            fileName={project.pptFileName}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProjectInfoItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

function formatProjectEvaluationDate(dateString: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString.replaceAll("-", ".");
  }

  const formatted = formatKoreaDateTimeFromUtc(dateString);
  return formatted || dateString;
}

function normalizeExternalUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
