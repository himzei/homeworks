"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pencil, Radio, RefreshCw } from "lucide-react";

import PeerEvaluationCriteriaEditor from "@/app/admin/_components/PeerEvaluationCriteriaEditor";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  PEER_EVALUATION_STATUS_LABEL,
  PEER_EVALUATION_STATUSES,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import type {
  PeerEvaluationCriterion,
  PeerEvaluationEvaluateeSummary,
  PeerEvaluationProject,
  PeerEvaluationRatingDetail,
} from "@/lib/peer-evaluation/types";

type Props = {
  project: PeerEvaluationProject;
  summaries: PeerEvaluationEvaluateeSummary[];
  details: PeerEvaluationRatingDetail[];
  totalRatingCount: number;
  backHref: string;
};

type ResultsPayload = {
  project?: PeerEvaluationProject;
  summaries?: PeerEvaluationEvaluateeSummary[];
  details?: PeerEvaluationRatingDetail[];
  totalRatingCount?: number;
  fetchedAt?: string;
  error?: string;
};

const POLL_INTERVAL_MS = 8_000;

const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900";

/**
 * 관리자 전용 동료평가 결과 — 실시간 구독 + 폴링, 프로젝트 수정
 */
export default function PeerEvaluationResultsPanel({
  project: initialProject,
  summaries: initialSummaries,
  details: initialDetails,
  totalRatingCount: initialTotal,
  backHref,
}: Props) {
  const supabaseRef = useRef(createClient());

  const [project, setProject] = useState(initialProject);
  const [summaries, setSummaries] = useState(initialSummaries);
  const [details, setDetails] = useState(initialDetails);
  const [totalRatingCount, setTotalRatingCount] = useState(initialTotal);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<
    "connecting" | "live" | "polling" | "error"
  >("connecting");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // 프로젝트 수정
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initialProject.title);
  const [editDescription, setEditDescription] = useState(
    initialProject.description ?? "",
  );
  const [editStatus, setEditStatus] = useState<PeerEvaluationStatus>(
    initialProject.status,
  );
  const [editCriteria, setEditCriteria] = useState<PeerEvaluationCriterion[]>(
    () => initialProject.criteria.map((item) => ({ ...item })),
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const applyResults = (payload: ResultsPayload) => {
    if (payload.project) setProject(payload.project);
    if (payload.summaries) setSummaries(payload.summaries);
    if (payload.details) setDetails(payload.details);
    if (typeof payload.totalRatingCount === "number") {
      setTotalRatingCount(payload.totalRatingCount);
    }
    setLastUpdatedAt(payload.fetchedAt ?? new Date().toISOString());
    setRefreshError(null);
  };

  const fetchResults = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsRefreshing(true);

    try {
      const response = await fetch(
        `/api/admin/peer-evaluations/${project.id}/results`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as ResultsPayload;

      if (!response.ok) {
        setRefreshError(payload.error ?? "결과를 불러오지 못했습니다.");
        return;
      }

      applyResults(payload);
    } catch (error) {
      console.error("동료평가 결과 갱신 실패:", error);
      setRefreshError("결과 갱신 중 오류가 발생했습니다.");
    } finally {
      if (!options?.silent) setIsRefreshing(false);
    }
  };

  // Realtime + 폴링 폴백
  useEffect(() => {
    const supabase = supabaseRef.current;
    const projectId = initialProject.id;
    let isActive = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const startPolling = (intervalMs: number, mode: "live" | "polling") => {
      clearPoll();
      setLiveStatus(mode);
      pollTimer = setInterval(() => {
        void fetchResults({ silent: true });
      }, intervalMs);
    };

    // Realtime 연결 전에도 바로 갱신 시작
    startPolling(POLL_INTERVAL_MS, "polling");

    const channel = supabase
      .channel(`peer-eval-results-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peer_evaluation_ratings",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          if (!isActive) return;
          void fetchResults({ silent: true });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "peer_evaluation_projects",
          filter: `id=eq.${projectId}`,
        },
        () => {
          if (!isActive) return;
          void fetchResults({ silent: true });
        },
      )
      .subscribe((status) => {
        if (!isActive) return;
        if (status === "SUBSCRIBED") {
          // Realtime 성공 시 폴링 간격을 늘려 보조로만 사용
          startPolling(POLL_INTERVAL_MS * 2, "live");
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          startPolling(POLL_INTERVAL_MS, "polling");
        }
      });

    return () => {
      isActive = false;
      clearPoll();
      void supabase.removeChannel(channel);
    };
    // 초기 프로젝트 ID 기준으로만 구독
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject.id]);

  const startEditing = () => {
    setEditTitle(project.title);
    setEditDescription(project.description ?? "");
    setEditStatus(project.status);
    setEditCriteria(project.criteria.map((item) => ({ ...item })));
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditError("제목을 입력해 주세요.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const response = await fetch(
        `/api/admin/peer-evaluations/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            description: editDescription.trim() || null,
            status: editStatus,
            criteria: editCriteria,
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        project?: PeerEvaluationProject;
      };

      if (!response.ok || !result.project) {
        setEditError(result.error ?? "수정에 실패했습니다.");
        return;
      }

      setProject(result.project);
      setIsEditing(false);
      // 항목 변경 후 집계도 다시 불러옴
      void fetchResults({ silent: true });
    } catch (error) {
      console.error("동료평가 프로젝트 수정 예외:", error);
      setEditError("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const liveLabel =
    liveStatus === "live"
      ? "실시간 연결됨"
      : liveStatus === "polling"
        ? "자동 갱신 중"
        : liveStatus === "error"
          ? "연결 오류"
          : "연결 중...";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href={backHref}>
              <ArrowLeft className="size-4" aria-hidden />
              목록으로
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {project.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {PEER_EVALUATION_STATUS_LABEL[project.status]} · 제출{" "}
            {totalRatingCount}건 · 피평가자 {summaries.length}명 · 평가항목{" "}
            {project.criteria.length}개
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {project.criteria.map((item) => item.label).join(" · ")}
          </p>
          {project.description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {project.description}
            </p>
          ) : null}
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            이 결과는 관리자만 볼 수 있습니다. 학생에게는 받은 점수가 공개되지
            않습니다.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <Radio
              className={[
                "size-3.5",
                liveStatus === "live"
                  ? "text-emerald-500"
                  : "text-amber-500",
              ].join(" ")}
              aria-hidden
            />
            {liveLabel}
            {lastUpdatedAt ? (
              <span className="text-zinc-400">
                · {new Date(lastUpdatedAt).toLocaleTimeString("ko-KR")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={startEditing}
              disabled={isEditing}
            >
              <Pencil className="size-4" aria-hidden />
              수정
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void fetchResults()}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={[
                  "size-4",
                  isRefreshing ? "animate-spin" : "",
                ].join(" ")}
                aria-hidden
              />
              새로고침
            </Button>
          </div>
        </div>
      </div>

      {refreshError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {refreshError}
        </p>
      ) : null}

      {isEditing ? (
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">프로젝트 수정</h2>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={120}
            disabled={isSavingEdit}
            className={inputClassName}
            placeholder="제목"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            disabled={isSavingEdit}
            className={inputClassName}
            placeholder="안내 문구 (선택)"
          />
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
              상태
            </span>
            <select
              value={editStatus}
              onChange={(e) =>
                setEditStatus(e.target.value as PeerEvaluationStatus)
              }
              disabled={isSavingEdit}
              className={inputClassName}
            >
              {PEER_EVALUATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PEER_EVALUATION_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <PeerEvaluationCriteriaEditor
            criteria={editCriteria}
            onChange={setEditCriteria}
            disabled={isSavingEdit}
          />
          {editError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isSavingEdit}
              onClick={() => void handleSaveEdit()}
            >
              {isSavingEdit ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSavingEdit}
              onClick={() => {
                setIsEditing(false);
                setEditError(null);
              }}
            >
              취소
            </Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">피평가자별 평균</h2>
        {summaries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            아직 제출된 평가가 없습니다. 학생이 제출하면 여기에 바로
            반영됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">학생</th>
                  <th className="px-4 py-2.5 font-medium">평가 수</th>
                  <th className="px-4 py-2.5 font-medium">종합 평균</th>
                  {project.criteria.map((criterion) => (
                    <th
                      key={criterion.id}
                      className="px-4 py-2.5 font-medium whitespace-nowrap"
                    >
                      {criterion.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {summaries.map((row) => (
                  <tr key={row.evaluateeId}>
                    <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                      {row.evaluateeName}
                    </td>
                    <td className="px-4 py-2.5">{row.ratingCount}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {row.averageScore ?? "-"}
                    </td>
                    {project.criteria.map((criterion) => (
                      <td key={criterion.id} className="px-4 py-2.5">
                        {row.criterionAverages?.[criterion.id] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">개별 평가 상세 (최신순)</h2>
        {details.length === 0 ? (
          <p className="text-sm text-zinc-500">상세 데이터가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">평가자</th>
                  <th className="px-4 py-2.5 font-medium">피평가자</th>
                  <th className="px-4 py-2.5 font-medium">종합</th>
                  {project.criteria.map((criterion) => (
                    <th
                      key={criterion.id}
                      className="px-4 py-2.5 font-medium whitespace-nowrap"
                    >
                      {criterion.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-medium">코멘트</th>
                  <th className="px-4 py-2.5 font-medium">일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {details.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5">{row.evaluatorName}</td>
                    <td className="px-4 py-2.5">{row.evaluateeName}</td>
                    <td className="px-4 py-2.5 font-medium">{row.score}</td>
                    {project.criteria.map((criterion) => (
                      <td key={criterion.id} className="px-4 py-2.5">
                        {row.criterionScores?.[criterion.id] ?? "-"}
                      </td>
                    ))}
                    <td className="max-w-xs truncate px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {row.comment || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">
                      {new Date(row.createdAt).toLocaleString("ko-KR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
