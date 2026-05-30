import Link from "next/link";
import { X } from "lucide-react";

import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";
import type {
  UserAssignmentPhaseSection,
  UserAssignmentProgress,
  UserAssignmentSubmissionItem,
} from "@/lib/fetch-user-assignment-progress";
import { getHomeworkSubmissionStatusStyle } from "@/lib/homework-submission-status";

type LearningStatusAssignmentProgressProps = {
  progress: UserAssignmentProgress;
};

/** 학습현황 — 나의 과제 제출 현황 섹션 */
export default function LearningStatusAssignmentProgress({
  progress,
}: LearningStatusAssignmentProgressProps) {
  const {
    courseGroupName,
    mainEducationStartDate,
    foundation,
    main,
    publishedAssignmentCount,
    submittedCount,
    submissionRatePercent,
    hasUnpublishedAssignments,
  } = progress;

  const hasAnyPublishedAssignments =
    foundation.publishedAssignmentCount + main.publishedAssignmentCount > 0;

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          나의 과제 제출 현황
        </h2>
        {courseGroupName ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {courseGroupName} 기준 · 게시 시작일이 지난 과제 중 회원가입(등록일) 이후 과제만 집계합니다.
            {mainEducationStartDate
              ? ` 본교육 시작일(${mainEducationStartDate}) 이전은 기초과정, 이후는 본과정입니다.`
              : null}
          </p>
        ) : null}
      </div>

      {!courseGroupName ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          과정명이 설정되지 않아 과제 제출 현황을 표시할 수 없습니다.{" "}
          <Link href="/profile" className="font-medium underline">
            프로필에서 과정명을 선택
          </Link>
          해 주세요.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <StatCard label="전체 과제" value={String(publishedAssignmentCount)} />
            <StatCard
              label="제출 완료"
              value={String(submittedCount)}
              valueClassName="text-green-600 dark:text-green-400"
            />
            <StatCard label="제출률" value={`${submissionRatePercent}%`} />
          </div>

          {hasAnyPublishedAssignments ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <PhaseSection
                title="기초과정"
                description="사전교육 기간 과제"
                section={foundation}
              />
              <PhaseSection
                title="본과정"
                description="본교육 기간 과제"
                section={main}
              />
            </div>
          ) : hasUnpublishedAssignments ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              게시 시작일이 지난 과제가 아직 없습니다.
            </p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              이 과정에 등록된 과제가 없습니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function PhaseSection({
  title,
  description,
  section,
}: {
  title: string;
  description: string;
  section: UserAssignmentPhaseSection;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          제출 {section.submittedCount}/{section.publishedAssignmentCount} ·{" "}
          {section.submissionRatePercent}%
        </p>
      </div>

      {section.assignments.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {section.assignments.map((assignment) => (
            <AssignmentSubmissionCard
              key={assignment.assignmentId}
              assignment={assignment}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          게시된 {title} 과제가 없습니다.
        </p>
      )}
    </div>
  );
}

function AssignmentSubmissionCard({
  assignment,
}: {
  assignment: UserAssignmentSubmissionItem;
}) {
  const statusStyle = getHomeworkSubmissionStatusStyle(
    assignment.submission?.status,
  );

  return (
    <article className="min-w-[260px] max-w-[320px] shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h4 className="text-base font-medium text-black dark:text-zinc-50">
        {assignment.title}
      </h4>
      {assignment.submission ? (
        <div className="mt-2 flex flex-col gap-2">
          <span
            className={`w-fit rounded-md px-3 py-1 text-xs font-medium ${statusStyle.bgColor} ${statusStyle.textColor}`}
          >
            {statusStyle.text}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            제출일:{" "}
            {formatKoreaDateTimeFromUtc(assignment.submission.submittedAt)}
          </span>
          {assignment.submission.url ? (
            <a
              href={assignment.submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              제출물 보기 →
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-full bg-red-500">
            <X className="size-3 text-white" />
          </div>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            미제출
          </span>
        </div>
      )}
    </article>
  );
}

function StatCard({
  label,
  value,
  valueClassName = "text-black dark:text-zinc-50",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}
