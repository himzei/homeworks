"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, FileDown, Loader2, Printer, Save } from "lucide-react";

import { useAdmin } from "@/lib/auth/SessionProvider";
import { isAbortError } from "@/lib/errors/is-abort-error";
import {
  buildProjectInfoBlocks,
  buildProjectTableColumns,
  normalizeProjectExternalUrl,
  type ProjectTableInfoContent,
} from "@/lib/evaluation/build-project-table-columns";
import {
  DATED_EVALUATION_SLOT_COUNT,
  padDatedScoreItemsToSlots,
} from "@/lib/evaluation/dated-score-table-slots";
import {
  openFinalEvaluationPrint,
  toPrintEntry,
} from "@/lib/evaluation/final-evaluation-print";
import type {
  StudentDatedScoreEvaluation,
  StudentFinalEvaluationRow,
  StudentHomeworkEvaluation,
  StudentProjectEvaluation,
} from "@/lib/evaluation/fetch-cohort-final-evaluation-data";
import type { StudentPeerEvaluation } from "@/lib/evaluation/fetch-cohort-peer-evaluation-scores";
import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";

type FinalEvaluationTabProps = {
  selectedGroup: string | null;
};

type EditableDraft = {
  consultationSummary: string;
  professorFinalEvaluation: string;
};

function ScoreBadge({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail: string;
}) {
  return (
    <div
      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
      title={detail}
    >
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-black dark:text-zinc-50">
        {score}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 dark:text-zinc-400 line-clamp-2">
        {detail}
      </p>
    </div>
  );
}

type DatedScoreTableTheme = {
  border: string;
  borderDark: string;
  bg: string;
  headerBg: string;
  headerText: string;
  cellBorder: string;
  totalBg: string;
  totalText: string;
};

const HOMEWORK_TABLE_THEME: DatedScoreTableTheme = {
  border: "border-emerald-200",
  borderDark: "dark:border-emerald-800",
  bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
  headerBg: "bg-emerald-100/60 dark:bg-emerald-900/30",
  headerText: "text-emerald-900 dark:text-emerald-200",
  cellBorder: "border-emerald-100 dark:border-emerald-900/50",
  totalBg: "bg-emerald-50/80 dark:bg-emerald-950/40",
  totalText: "text-emerald-900 dark:text-emerald-100",
};

const FOUNDATION_TABLE_THEME: DatedScoreTableTheme = {
  border: "border-sky-200",
  borderDark: "dark:border-sky-800",
  bg: "bg-sky-50/40 dark:bg-sky-950/20",
  headerBg: "bg-sky-100/60 dark:bg-sky-900/30",
  headerText: "text-sky-900 dark:text-sky-200",
  cellBorder: "border-sky-100 dark:border-sky-900/50",
  totalBg: "bg-sky-50/80 dark:bg-sky-950/40",
  totalText: "text-sky-900 dark:text-sky-100",
};

const PROJECT_TABLE_THEME: DatedScoreTableTheme = {
  border: "border-violet-200",
  borderDark: "dark:border-violet-800",
  bg: "bg-violet-50/40 dark:bg-violet-950/20",
  headerBg: "bg-violet-100/60 dark:bg-violet-900/30",
  headerText: "text-violet-900 dark:text-violet-200",
  cellBorder: "border-violet-100 dark:border-violet-900/50",
  totalBg: "bg-violet-50/80 dark:bg-violet-950/40",
  totalText: "text-violet-900 dark:text-violet-100",
};

const PEER_TABLE_THEME: DatedScoreTableTheme = {
  border: "border-rose-200",
  borderDark: "dark:border-rose-800",
  bg: "bg-rose-50/40 dark:bg-rose-950/20",
  headerBg: "bg-rose-100/60 dark:bg-rose-900/30",
  headerText: "text-rose-900 dark:text-rose-200",
  cellBorder: "border-rose-100 dark:border-rose-900/50",
  totalBg: "bg-rose-50/80 dark:bg-rose-950/40",
  totalText: "text-rose-900 dark:text-rose-100",
};

const EXAM_TABLE_THEME: DatedScoreTableTheme = {
  border: "border-amber-200",
  borderDark: "dark:border-amber-800",
  bg: "bg-amber-50/40 dark:bg-amber-950/20",
  headerBg: "bg-amber-100/60 dark:bg-amber-900/30",
  headerText: "text-amber-900 dark:text-amber-200",
  cellBorder: "border-amber-100 dark:border-amber-900/50",
  totalBg: "bg-amber-50/80 dark:bg-amber-950/40",
  totalText: "text-amber-900 dark:text-amber-100",
};

/** 가로 평가 표 마지막 합계·평균 열 너비 (시험·과제·기초·프로젝트·동료평가 공통) */
const EVALUATION_TOTAL_COLUMN_CLASS =
  "w-[96px] min-w-[96px] max-w-[96px] shrink-0 whitespace-nowrap";

/** 날짜 열 헤더 + 가로 점수 행 */
function DatedScoreTableSection({
  title,
  ariaLabel,
  evaluation,
  emptyMessage,
  theme,
  fitContent = false,
  fixedSlotCount,
  maxTotalScore,
}: {
  title: string;
  ariaLabel: string;
  evaluation: StudentDatedScoreEvaluation;
  emptyMessage: string;
  theme: DatedScoreTableTheme;
  /** true면 열 개수·내용에 맞는 너비(전체 폭 채우지 않음) */
  fitContent?: boolean;
  /** 설정 시 평가 항목 칸을 고정 개수로 표시(빈 칸은 비움) */
  fixedSlotCount?: number;
  /** 만점(분모). 없으면 evaluation.maxTotalScore 사용 */
  maxTotalScore?: number;
}) {
  const filledItemCount = evaluation.items.length;
  const slots = fixedSlotCount
    ? padDatedScoreItemsToSlots(evaluation.items, fixedSlotCount)
    : evaluation.items.map((item) => ({ ...item, isEmpty: false }));
  const showTable = fixedSlotCount ? true : filledItemCount > 0;
  const resolvedMaxTotal =
    maxTotalScore ?? evaluation.maxTotalScore ?? null;

  return (
    <section
      className={cn(
        "rounded-lg border overflow-hidden",
        theme.border,
        theme.borderDark,
        theme.bg,
        fitContent && "w-fit max-w-full",
      )}
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b",
          theme.border,
          theme.borderDark,
        )}
      >
        <h3 className={cn("text-sm font-semibold", theme.headerText)}>
          {title}
        </h3>
        <p className={cn("text-sm tabular-nums", theme.headerText)}>
          합계{" "}
          <span className="font-bold text-base">{evaluation.totalScore}</span>
          {resolvedMaxTotal != null && resolvedMaxTotal > 0 ? (
            <>
              <span className="mx-0.5 opacity-70">/</span>
              <span className="font-bold text-base">{resolvedMaxTotal}</span>
            </>
          ) : null}
          점
          <span className="text-xs font-normal opacity-80 ml-1">
            ({filledItemCount}건)
          </span>
        </p>
      </div>

      {!showTable ? (
        <p className="px-3 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <div
          className={cn(
            "overflow-x-auto",
            fitContent && "w-fit max-w-full",
          )}
        >
          <table
            className={cn(
              "text-xs border-collapse",
              fitContent ? "w-auto" : "w-full min-w-max",
            )}
          >
            <thead>
              <tr className={theme.headerBg}>
                {slots.map((slot) => (
                  <th
                    key={slot.key}
                    className={cn(
                      "px-2 py-2 font-medium text-center align-middle border-r whitespace-nowrap",
                      fitContent ? "min-w-0" : "min-w-[72px]",
                      theme.headerText,
                      theme.cellBorder,
                      slot.isEmpty && "opacity-40",
                    )}
                    title={slot.isEmpty ? undefined : slot.title}
                  >
                    {slot.isEmpty ? (
                      <span className="block min-h-[2rem]" aria-hidden />
                    ) : (
                      <span className="block tabular-nums text-[12px] whitespace-nowrap">
                        {slot.dateLabel}
                      </span>
                    )}
                  </th>
                ))}
                <th
                  className={cn(
                    "px-2 py-2 font-semibold text-center",
                    fitContent ? "min-w-0" : EVALUATION_TOTAL_COLUMN_CLASS,
                    theme.headerBg,
                    theme.headerText,
                  )}
                >
                  합계
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white/80 dark:bg-zinc-900/50">
                {slots.map((slot) => {
                  const commentText = slot.comment?.trim() || "";
                  return (
                    <td
                      key={`score-${slot.key}`}
                      className={cn(
                        "border-r px-2 py-3 text-center tabular-nums",
                        theme.cellBorder,
                        slot.isEmpty
                          ? "text-transparent"
                          : "text-black dark:text-zinc-50",
                      )}
                      aria-label={
                        slot.isEmpty ? undefined : `${slot.title} 점수`
                      }
                      title={commentText || undefined}
                    >
                      {slot.isEmpty ? (
                        "\u00a0"
                      ) : (
                        <span className="inline-flex flex-col items-center gap-1 leading-none">
                          <span className="text-base font-bold">
                            {slot.score}
                          </span>
                          {commentText ? (
                            <span className="max-w-[6.5rem] whitespace-pre-wrap text-[10px] font-normal leading-snug text-zinc-600 dark:text-zinc-400">
                              {commentText}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "px-2 py-3 text-center font-bold text-base tabular-nums",
                    !fitContent && EVALUATION_TOTAL_COLUMN_CLASS,
                    theme.totalBg,
                    theme.totalText,
                  )}
                >
                  {resolvedMaxTotal != null && resolvedMaxTotal > 0 ? (
                    <>
                      {evaluation.totalScore}
                      <span className="mx-0.5 text-sm font-semibold opacity-70">
                        /
                      </span>
                      {resolvedMaxTotal}
                    </>
                  ) : (
                    evaluation.totalScore
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HomeworkEvaluationSection({
  homework,
}: {
  homework: StudentHomeworkEvaluation;
}) {
  const evaluation: StudentDatedScoreEvaluation = {
    totalScore: homework.totalScore,
    maxTotalScore: homework.maxTotalScore,
    items: homework.items.map((item) => ({
      key: item.assignmentId,
      dateLabel: item.dateLabel,
      // 한글 주석: 추가 필드만 구분 표시 (본과정 섹션)
      title: item.isExtraField ? `[추가] ${item.title}` : item.title,
      score: item.score,
    })),
  };

  return (
    <DatedScoreTableSection
      title="과제평가"
      ariaLabel="과제평가"
      evaluation={evaluation}
      emptyMessage="등록된 본과정 과제가 없습니다."
      theme={HOMEWORK_TABLE_THEME}
      fixedSlotCount={DATED_EVALUATION_SLOT_COUNT}
    />
  );
}

function FoundationEvaluationSection({
  foundation,
}: {
  foundation: StudentDatedScoreEvaluation;
}) {
  return (
    <DatedScoreTableSection
      title="기초과정 평가"
      ariaLabel="기초과정 평가"
      evaluation={foundation}
      emptyMessage="기초과정 과제·시험 항목이 없습니다."
      theme={FOUNDATION_TABLE_THEME}
      fixedSlotCount={DATED_EVALUATION_SLOT_COUNT}
    />
  );
}

/** 시험·미니프로젝트 — 평가 항목을 세로(행)로 배치 */
function ExamEvaluationSection({
  exam,
}: {
  exam: StudentDatedScoreEvaluation;
}) {
  const theme = EXAM_TABLE_THEME;
  // 등급(A~F) 항목은 점수 합산에서 제외
  const numericTotal = exam.items.reduce((sum, item) => {
    if (item.grade?.trim()) return sum;
    return sum + item.score;
  }, 0);
  const hasNumericItem = exam.items.some((item) => !item.grade?.trim());

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border",
        theme.border,
        theme.borderDark,
        theme.bg,
      )}
      aria-label="시험평가 및 미니프로젝트평가"
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          theme.border,
          theme.borderDark,
        )}
      >
        <h3 className={cn("text-sm font-semibold", theme.headerText)}>
          시험평가 및 미니프로젝트평가
        </h3>
        <p className={cn("text-sm tabular-nums", theme.headerText)}>
          {hasNumericItem ? (
            <>
              합계{" "}
              <span className="text-base font-bold">{numericTotal}</span>점
              <span className="ml-1 text-xs font-normal opacity-80">
                ({exam.items.length}건)
              </span>
            </>
          ) : (
            <span className="text-xs font-normal opacity-80">
              {exam.items.length}건
            </span>
          )}
        </p>
      </div>

      {exam.items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          등록된 추가 시험 항목이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className={theme.headerBg}>
                <th
                  className={cn(
                    "w-[7.5rem] border-r px-3 py-2 text-left text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  평가일
                </th>
                <th
                  className={cn(
                    "border-r px-3 py-2 text-left text-xs font-medium",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  평가 항목
                </th>
                <th
                  className={cn(
                    "min-w-[10rem] border-r px-3 py-2 text-left text-xs font-medium",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  코멘트
                </th>
                <th
                  className={cn(
                    "w-[5.5rem] border-r px-3 py-2 text-center text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  등수
                </th>
                <th
                  className={cn(
                    "w-[5.5rem] px-3 py-2 text-center text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                  )}
                >
                  등급/점수
                </th>
              </tr>
            </thead>
            <tbody>
              {exam.items.map((item) => {
                const commentText = item.comment?.trim() || "";
                const gradeLabel = item.grade?.trim().toUpperCase() || null;
                const rankLabel = formatPeerRankLabel(
                  item.rank ?? null,
                  item.rankedStudentCount ?? 0,
                );
                return (
                  <tr
                    key={item.key}
                    className="border-t border-amber-100 bg-white/80 dark:border-amber-900/40 dark:bg-zinc-900/50"
                  >
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300",
                        theme.cellBorder,
                      )}
                    >
                      {item.dateLabel}
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50",
                        theme.cellBorder,
                      )}
                    >
                      {item.title}
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-xs leading-snug whitespace-pre-wrap text-zinc-600 dark:text-zinc-400",
                        theme.cellBorder,
                      )}
                    >
                      {commentText || (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-center text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300",
                        theme.cellBorder,
                      )}
                    >
                      {rankLabel ?? (
                        <span className="font-normal text-zinc-400 dark:text-zinc-500">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-base font-bold whitespace-nowrap text-black dark:text-zinc-50">
                      {gradeLabel ? (
                        gradeLabel
                      ) : (
                        <span className="tabular-nums">{item.score}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** "8.4 (3/17위)" — 동료평가 평균 점수와 기수 내 등수 */
function formatPeerScoreWithRank(peer: StudentPeerEvaluation): string {
  if (peer.averageScore === null) return "-";
  if (peer.rank === null) return `${peer.averageScore}`;
  return `${peer.averageScore} (${peer.rank}/${peer.rankedStudentCount}위)`;
}

/** "3/17위" — 등수 라벨 (없으면 null) */
function formatPeerRankLabel(
  rank: number | null,
  rankedStudentCount: number,
): string | null {
  if (rank === null || rankedStudentCount <= 0) return null;
  return `${rank}/${rankedStudentCount}위`;
}

/** 동료평가 — 프로젝트별 받은 점수를 세로(행)로 배치 */
function PeerEvaluationSection({ peer }: { peer: StudentPeerEvaluation }) {
  const theme = PEER_TABLE_THEME;
  const overallRankLabel = formatPeerRankLabel(
    peer.rank,
    peer.rankedStudentCount,
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border",
        theme.border,
        theme.borderDark,
        theme.bg,
      )}
      aria-label="동료평가"
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          theme.border,
          theme.borderDark,
        )}
      >
        <h3 className={cn("text-sm font-semibold", theme.headerText)}>
          동료평가
        </h3>
        <p className={cn("text-sm tabular-nums", theme.headerText)}>
          평균{" "}
          <span className="text-base font-bold">
            {peer.averageScore ?? "-"}
          </span>
          {peer.averageScore !== null ? "점" : null}
          {overallRankLabel ? (
            <span className="ml-1.5 text-xs font-semibold opacity-90">
              {overallRankLabel}
            </span>
          ) : null}
          <span className="ml-1 text-xs font-normal opacity-80">
            ({peer.items.length}건)
          </span>
        </p>
      </div>

      {peer.items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          진행중이거나 종료된 동료평가 프로젝트가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className={theme.headerBg}>
                <th
                  className={cn(
                    "w-[7.5rem] border-r px-3 py-2 text-left text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  평가일
                </th>
                <th
                  className={cn(
                    "border-r px-3 py-2 text-left text-xs font-medium",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  프로젝트
                </th>
                <th
                  className={cn(
                    "w-[4.5rem] border-r px-3 py-2 text-center text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  평가인원
                </th>
                <th
                  className={cn(
                    "w-[5.5rem] border-r px-3 py-2 text-center text-xs font-medium whitespace-nowrap",
                    theme.headerText,
                    theme.cellBorder,
                  )}
                >
                  등수
                </th>
                <th
                  className={cn(
                    "w-[4.5rem] px-3 py-2 text-center text-xs font-medium",
                    theme.headerText,
                  )}
                >
                  점수
                </th>
              </tr>
            </thead>
            <tbody>
              {peer.items.map((item) => {
                const itemRankLabel = formatPeerRankLabel(
                  item.rank,
                  item.rankedStudentCount,
                );

                return (
                  <tr
                    key={item.key}
                    className="border-t border-rose-100 bg-white/80 dark:border-rose-900/40 dark:bg-zinc-900/50"
                  >
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300",
                        theme.cellBorder,
                      )}
                    >
                      {item.dateLabel}
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-50",
                        theme.cellBorder,
                      )}
                    >
                      {item.title}
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-center text-xs tabular-nums text-zinc-600 dark:text-zinc-400",
                        theme.cellBorder,
                      )}
                    >
                      {item.ratingCount}명
                    </td>
                    <td
                      className={cn(
                        "border-r px-3 py-2.5 text-center text-xs font-semibold tabular-nums",
                        theme.headerText,
                        theme.cellBorder,
                      )}
                    >
                      {itemRankLabel ?? "-"}
                    </td>
                    <td
                      className="px-3 py-2.5 text-center text-base font-bold tabular-nums text-black dark:text-zinc-50"
                      aria-label={`${item.title} 점수`}
                    >
                      {item.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** 프로젝트 평가 — 정보 칸(주제·업무분장 / GitHub·배포) */
function ProjectInfoBlock({ info }: { info: ProjectTableInfoContent }) {
  const githubUrl = info.githubUrl.trim();
  const deployUrl = info.deployUrl.trim();

  return (
    <div className="space-y-1 px-3 py-2.5 text-[11px] leading-snug text-black dark:text-zinc-50">
      {info.dateLabel ? (
        <p className="text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {info.dateLabel}
        </p>
      ) : null}
      {/* 한글 주석: 1행 — 주제 · 업무분장 */}
      <p className="whitespace-normal break-keep">
        <span className="font-medium">{info.topic}</span>
        <span className="mx-1.5 text-zinc-400 dark:text-zinc-500">·</span>
        <span className="text-zinc-700 dark:text-zinc-300">
          {info.workAssignment}
        </span>
      </p>
      {/* 한글 주석: 2행 — GitHub · 팀 배포주소 */}
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 break-all">
        {githubUrl ? (
          <a
            href={normalizeProjectExternalUrl(githubUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {githubUrl}
          </a>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">GitHub —</span>
        )}
        <span className="text-zinc-400 dark:text-zinc-500">·</span>
        {deployUrl ? (
          <a
            href={normalizeProjectExternalUrl(deployUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {deployUrl}
          </a>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">배포 —</span>
        )}
      </p>
    </div>
  );
}

/** 프로젝트 평가 — 정보 2행 + 점수 표(합계 포함) */
function ProjectEvaluationSection({
  project,
}: {
  project: StudentProjectEvaluation;
}) {
  const theme = PROJECT_TABLE_THEME;
  const infoBlocks = buildProjectInfoBlocks(project.items);
  const columns = buildProjectTableColumns(project.items, project.totalScore);
  const hasContent = infoBlocks.length > 0 || columns.length > 0;

  return (
    <section
      className={cn(
        "rounded-lg border overflow-hidden w-full",
        theme.border,
        theme.borderDark,
        theme.bg,
      )}
      aria-label="프로젝트 평가"
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b",
          theme.border,
          theme.borderDark,
        )}
      >
        <h3 className={cn("text-sm font-semibold", theme.headerText)}>
          프로젝트 평가
        </h3>
        <p className={cn("text-sm tabular-nums", theme.headerText)}>
          합계{" "}
          <span className="font-bold text-base">{project.totalScore}</span>점
          <span className="text-xs font-normal opacity-80 ml-1">
            ({project.items.length}건)
          </span>
        </p>
      </div>

      {!hasContent ? (
        <p className="px-3 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          등록된 프로젝트·팀 평가 항목이 없습니다.
        </p>
      ) : (
        <>
          {infoBlocks.map((info) => (
            <div
              key={info.key}
              className={cn("border-b", theme.border, theme.borderDark)}
            >
              <ProjectInfoBlock info={info} />
            </div>
          ))}
          {columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 border-collapse text-xs table-fixed">
                <thead>
                  <tr className={theme.headerBg}>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={cn(
                          "px-2 py-2 text-center align-middle font-medium border-r whitespace-nowrap",
                          column.isGrandTotal
                            ? cn(EVALUATION_TOTAL_COLUMN_CLASS, theme.totalBg)
                            : "w-auto",
                          theme.headerText,
                          theme.cellBorder,
                        )}
                      >
                        <span className="block text-[12px]">
                          {column.dateLabel
                            ? `${column.dateLabel} · ${column.headerTitle}`
                            : column.headerTitle}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white/80 dark:bg-zinc-900/50">
                    {columns.map((column) => (
                      <td
                        key={`score-${column.key}`}
                        className={cn(
                          "border-r px-2 py-3 text-center align-middle tabular-nums text-base font-medium text-black dark:text-zinc-50",
                          theme.cellBorder,
                          column.isGrandTotal &&
                            cn(
                              EVALUATION_TOTAL_COLUMN_CLASS,
                              "font-bold",
                              theme.totalBg,
                              theme.totalText,
                            ),
                          column.isTotalColumn &&
                            !column.isGrandTotal &&
                            "font-semibold",
                        )}
                      >
                        {column.score}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/** 화면에 입력 중인 초안 우선, 없으면 저장된 값 */
function getEditableDraft(
  drafts: Record<string, EditableDraft>,
  row: StudentFinalEvaluationRow,
): EditableDraft {
  return (
    drafts[row.studentId] ?? {
      consultationSummary: row.consultationSummary,
      professorFinalEvaluation: row.professorFinalEvaluation,
    }
  );
}

export default function FinalEvaluationTab({
  selectedGroup,
}: FinalEvaluationTabProps) {
  const { isAdmin, isCheckingAdmin } = useAdmin();

  const [rows, setRows] = useState<StudentFinalEvaluationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditableDraft>>({});
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadRows = useCallback(async (signal: AbortSignal) => {
    if (!selectedGroup) {
      setRows([]);
      setDrafts({});
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({ group: selectedGroup });
      const response = await fetch(
        `/api/admin/final-evaluations?${params.toString()}`,
        { signal },
      );
      const payload = await response.json();

      if (!response.ok) {
        setLoadError(payload.error ?? "데이터를 불러오지 못했습니다.");
        setRows([]);
        setDrafts({});
        return;
      }

      const loadedRows = (payload.rows ?? []) as StudentFinalEvaluationRow[];
      setRows(loadedRows);

      const nextDrafts: Record<string, EditableDraft> = {};
      for (const row of loadedRows) {
        nextDrafts[row.studentId] = {
          consultationSummary: row.consultationSummary,
          professorFinalEvaluation: row.professorFinalEvaluation,
        };
      }
      setDrafts(nextDrafts);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("최종 평가 목록 조회 실패:", error);
      setLoadError("데이터를 불러오는 중 오류가 발생했습니다.");
      setRows([]);
      setDrafts({});
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (isCheckingAdmin || !isAdmin) return;

    const controller = new AbortController();
    void loadRows(controller.signal);
    return () => controller.abort();
  }, [isCheckingAdmin, isAdmin, loadRows]);

  useEffect(() => {
    setExpandedStudentId(null);
    setSaveMessage(null);
  }, [selectedGroup]);

  const updateDraft = (
    studentId: string,
    patch: Partial<EditableDraft>,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        consultationSummary: prev[studentId]?.consultationSummary ?? "",
        professorFinalEvaluation:
          prev[studentId]?.professorFinalEvaluation ?? "",
        ...patch,
      },
    }));
  };

  const handleSave = async (studentId: string) => {
    if (!selectedGroup) return;

    const draft = drafts[studentId];
    if (!draft) return;

    setSavingStudentId(studentId);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/admin/final-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: selectedGroup,
          studentId,
          consultationSummary: draft.consultationSummary,
          professorFinalEvaluation: draft.professorFinalEvaluation,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setSaveMessage(payload.error ?? "저장에 실패했습니다.");
        return;
      }

      setRows((prev) =>
        prev.map((row) =>
          row.studentId === studentId
            ? {
                ...row,
                consultationSummary: draft.consultationSummary,
                professorFinalEvaluation: draft.professorFinalEvaluation,
                savedUpdatedAt: payload.updatedAt ?? new Date().toISOString(),
              }
            : row,
        ),
      );
      setSaveMessage("저장되었습니다.");
    } catch (error) {
      console.error("최종 평가 저장 실패:", error);
      setSaveMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingStudentId(null);
    }
  };

  const fillConsultationFromLogs = (studentId: string) => {
    const row = rows.find((item) => item.studentId === studentId);
    if (!row) return;
    updateDraft(studentId, {
      consultationSummary: row.consultationAutoSummary,
    });
  };

  const handlePrintOneStudent = (row: StudentFinalEvaluationRow) => {
    if (!selectedGroup) return;

    const opened = openFinalEvaluationPrint({
      groupName: selectedGroup,
      entries: [toPrintEntry(row, getEditableDraft(drafts, row))],
    });

    if (!opened) {
      setSaveMessage(
        "팝업이 차단되어 출력할 수 없습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
      );
    }
  };

  const handlePrintAllStudents = () => {
    if (!selectedGroup || rows.length === 0) return;

    const opened = openFinalEvaluationPrint({
      groupName: selectedGroup,
      entries: rows.map((row) =>
        toPrintEntry(row, getEditableDraft(drafts, row)),
      ),
    });

    if (!opened) {
      setSaveMessage(
        "팝업이 차단되어 출력할 수 없습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.",
      );
    }
  };

  if (isCheckingAdmin) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
        권한 확인 중...
      </p>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-200">
        관리자만 최종 평가를 작성할 수 있습니다.
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        상단에서 기수(과정)를 선택해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {saveMessage ? (
        <p
          className={cn(
            "text-sm px-3 py-2 rounded-lg",
            saveMessage.includes("실패") || saveMessage.includes("오류")
              ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
              : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
          )}
        >
          {saveMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          이 기수에 등록된 학생이 없습니다.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/40 px-4 py-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              전체 {rows.length}명 · 새 탭 미리보기 후 「PDF로 저장 (인쇄)」
              클릭
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintAllStudents}
            >
              <Printer className="h-4 w-4 mr-2" aria-hidden />
              모든 학생 출력
            </Button>
          </div>

          <ul className="space-y-3">
          {rows.map((row) => {
            const isExpanded = expandedStudentId === row.studentId;
            const draft = getEditableDraft(drafts, row);
            const isSaving = savingStudentId === row.studentId;

            return (
              <li
                key={row.studentId}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden"
              >
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    className="flex-1 flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors min-w-0"
                    onClick={() =>
                      setExpandedStudentId(
                        isExpanded ? null : row.studentId,
                      )
                    }
                    aria-expanded={isExpanded}
                  >
                    <span className="font-semibold text-black dark:text-zinc-50 min-w-[4rem]">
                      {row.studentName}
                    </span>
                    <div className="flex flex-wrap gap-2 flex-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      <span>
                        기초 {row.metrics.foundation.totalScore}
                        {row.metrics.foundation.maxTotalScore
                          ? `/${row.metrics.foundation.maxTotalScore}`
                          : ""}
                      </span>
                      <span>
                        시험{" "}
                        {row.metrics.exam.items.some((item) =>
                          item.grade?.trim(),
                        )
                          ? row.metrics.exam.items
                              .map(
                                (item) =>
                                  item.grade?.trim().toUpperCase() ||
                                  String(item.score),
                              )
                              .join(" · ") || "-"
                          : row.metrics.exam.totalScore}
                      </span>
                      <span>
                        과제 {row.metrics.homework.totalScore}/
                        {row.metrics.homework.maxTotalScore}
                      </span>
                      <span>프로젝트 {row.metrics.project.totalScore}</span>
                      <span title="동료평가 평균 점수 · 기수 내 등수">
                        동료 {formatPeerScoreWithRank(row.metrics.peer)}
                      </span>
                    </div>
                    {row.savedUpdatedAt ? (
                      <span className="text-[10px] text-zinc-400">
                        저장됨
                      </span>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 self-center my-2 mr-3"
                    onClick={() => handlePrintOneStudent(row)}
                    title={`${row.studentName} 최종 평가 A4 PDF 출력`}
                  >
                    <FileDown className="h-4 w-4 mr-1.5" aria-hidden />
                    PDF
                  </Button>
                </div>

                {isExpanded ? (
                  <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-4 space-y-4">
                    <FoundationEvaluationSection
                      foundation={row.metrics.foundation}
                    />

                    <HomeworkEvaluationSection
                      homework={row.metrics.homework}
                    />

                    <ExamEvaluationSection exam={row.metrics.exam} />

                    <ProjectEvaluationSection project={row.metrics.project} />

                    <PeerEvaluationSection peer={row.metrics.peer} />

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label
                          htmlFor={`consultation-${row.studentId}`}
                          className="text-sm font-medium text-black dark:text-zinc-50"
                        >
                          상담 내용
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            fillConsultationFromLogs(row.studentId)
                          }
                          disabled={
                            row.consultationLogs.length === 0 ||
                            isSaving
                          }
                        >
                          상담일지 불러오기
                        </Button>
                      </div>
                      {row.consultationLogs.length === 0 ? (
                        <p className="text-xs text-zinc-500 mb-2">
                          등록된 상담일지가 없습니다.
                        </p>
                      ) : (
                        <details className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <summary className="cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
                            상담일지 {row.consultationLogs.length}건 미리보기
                          </summary>
                          <ul className="mt-2 space-y-2 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700">
                            {row.consultationLogs.map((log) => (
                              <li key={log.id}>
                                <span className="font-medium tabular-nums">
                                  {log.consultationDate.slice(0, 10)}
                                </span>
                                <p className="mt-0.5 whitespace-pre-wrap">
                                  {log.content}
                                </p>
                                {log.notes ? (
                                  <p className="mt-0.5 text-zinc-500">
                                    메모: {log.notes}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <textarea
                        id={`consultation-${row.studentId}`}
                        value={draft.consultationSummary}
                        onChange={(event) =>
                          updateDraft(row.studentId, {
                            consultationSummary: event.target.value,
                          })
                        }
                        rows={6}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="상담 내용 요약을 입력하거나 상담일지 불러오기를 사용하세요."
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`professor-${row.studentId}`}
                        className="block text-sm font-medium text-black dark:text-zinc-50 mb-2"
                      >
                        교수 최종 평가
                      </label>
                      <textarea
                        id={`professor-${row.studentId}`}
                        value={draft.professorFinalEvaluation}
                        onChange={(event) =>
                          updateDraft(row.studentId, {
                            professorFinalEvaluation: event.target.value,
                          })
                        }
                        rows={5}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="교수 최종 평가 의견을 작성하세요."
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => void handleSave(row.studentId)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2
                              className="h-4 w-4 animate-spin mr-2"
                              aria-hidden
                            />
                            저장 중...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" aria-hidden />
                            저장
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
          </ul>
        </>
      )}
    </div>
  );
}
