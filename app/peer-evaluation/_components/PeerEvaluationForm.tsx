"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  PEER_EVALUATION_MIN_SCORE,
  PEER_EVALUATION_STATUS_LABEL,
} from "@/lib/peer-evaluation/constants";
import type { PeerEvaluationProject } from "@/lib/peer-evaluation/types";

type Classmate = {
  id: string;
  name: string;
};

type OwnRating = {
  evaluateeId: string;
  score: number;
  criterionScores: Record<string, number>;
  comment: string | null;
};

type Props = {
  project: PeerEvaluationProject;
  classmates: Classmate[];
  initialRatings: OwnRating[];
  currentUserId: string;
};

type DraftState = {
  criterionScores: Record<string, number>;
  comment: string;
};

function buildDefaultScores(
  project: PeerEvaluationProject,
  existing?: Record<string, number>,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const criterion of project.criteria) {
    const previous = existing?.[criterion.id];
    scores[criterion.id] =
      typeof previous === "number"
        ? previous
        : Math.min(7, criterion.maxScore);
  }
  return scores;
}

/**
 * 학생 평가 폼 — 설정된 평가항목별로 점수 입력. 받은 점수는 조회하지 않음.
 */
export default function PeerEvaluationForm({
  project,
  classmates,
  initialRatings,
  currentUserId,
}: Props) {
  const isOpen = project.status === "open";
  const criteria = project.criteria;

  const [ratingsByEvaluatee, setRatingsByEvaluatee] = useState<
    Record<string, OwnRating>
  >(() => {
    const map: Record<string, OwnRating> = {};
    for (const rating of initialRatings) {
      map[rating.evaluateeId] = rating;
    }
    return map;
  });

  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const map: Record<string, DraftState> = {};
    for (const mate of classmates) {
      const existing = initialRatings.find((r) => r.evaluateeId === mate.id);
      map[mate.id] = {
        criterionScores: buildDefaultScores(project, existing?.criterionScores),
        comment: existing?.comment ?? "",
      };
    }
    return map;
  });

  const [savingId, setSavingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const completedCount = useMemo(
    () => Object.keys(ratingsByEvaluatee).length,
    [ratingsByEvaluatee],
  );

  const clearError = (evaluateeId: string) => {
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[evaluateeId];
      return next;
    });
  };

  const handleSave = async (evaluateeId: string) => {
    if (!isOpen) return;
    if (evaluateeId === currentUserId) return;

    const draft = drafts[evaluateeId];
    if (!draft) return;

    setSavingId(evaluateeId);
    clearError(evaluateeId);

    try {
      const response = await fetch(
        `/api/peer-evaluations/${project.id}/ratings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evaluateeId,
            criterionScores: draft.criterionScores,
            comment: draft.comment.trim() || null,
          }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        rating?: OwnRating;
      };

      if (!response.ok || !result.rating) {
        setErrorById((prev) => ({
          ...prev,
          [evaluateeId]: result.error ?? "저장에 실패했습니다.",
        }));
        return;
      }

      setRatingsByEvaluatee((prev) => ({
        ...prev,
        [evaluateeId]: {
          evaluateeId: result.rating!.evaluateeId,
          score: result.rating!.score,
          criterionScores: result.rating!.criterionScores,
          comment: result.rating!.comment,
        },
      }));
    } catch (error) {
      console.error("동료평가 저장 예외:", error);
      setErrorById((prev) => ({
        ...prev,
        [evaluateeId]: "저장 중 오류가 발생했습니다.",
      }));
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelSubmission = async (evaluateeId: string) => {
    if (!isOpen) return;
    if (evaluateeId === currentUserId) return;
    if (!ratingsByEvaluatee[evaluateeId]) return;

    if (!window.confirm("이 동료에 대한 제출을 취소할까요?")) return;

    setCancelingId(evaluateeId);
    clearError(evaluateeId);

    try {
      const response = await fetch(
        `/api/peer-evaluations/${project.id}/ratings?evaluateeId=${encodeURIComponent(evaluateeId)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorById((prev) => ({
          ...prev,
          [evaluateeId]: result.error ?? "제출 취소에 실패했습니다.",
        }));
        return;
      }

      // 제출 상태만 제거하고, 입력값은 그대로 두어 다시 제출하기 쉽게 함
      setRatingsByEvaluatee((prev) => {
        const next = { ...prev };
        delete next[evaluateeId];
        return next;
      });
    } catch (error) {
      console.error("동료평가 제출 취소 예외:", error);
      setErrorById((prev) => ({
        ...prev,
        [evaluateeId]: "제출 취소 중 오류가 발생했습니다.",
      }));
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href="/peer-evaluation">
            <ArrowLeft className="size-4" aria-hidden />
            목록으로
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {project.title}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {PEER_EVALUATION_STATUS_LABEL[project.status]} · 내 제출{" "}
          {completedCount}/{classmates.length}명 · 평가항목 {criteria.length}개
        </p>
        {project.description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {project.description}
          </p>
        ) : null}
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          내가 준 점수만 보입니다. 다른 학생이 받은 점수·평균은 확인할 수
          없습니다.
        </p>
        {!isOpen ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            종료된 프로젝트입니다. 새 평가·수정은 할 수 없고, 내가 제출한
            내용만 확인할 수 있습니다.
          </p>
        ) : null}
      </div>

      {classmates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          평가할 동료가 없습니다.
        </p>
      ) : (
        <ul className="space-y-4">
          {classmates.map((mate) => {
            const draft = drafts[mate.id] ?? {
              criterionScores: buildDefaultScores(project),
              comment: "",
            };
            const saved = ratingsByEvaluatee[mate.id];
            const isSaving = savingId === mate.id;
            const isCanceling = cancelingId === mate.id;
            const isBusy = isSaving || isCanceling;
            const errorMessage = errorById[mate.id];

            return (
              <li
                key={mate.id}
                className={
                  saved
                    ? "rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/30"
                    : "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {mate.name}
                    </span>
                    {saved ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                        <Check className="size-3.5" aria-hidden />
                        제출됨 (평균 {saved.score}점)
                      </span>
                    ) : (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        미제출
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="mt-3 grid w-full gap-2"
                  style={{
                    // 항목 개수만큼 동일 너비로 균등 분할
                    gridTemplateColumns: `repeat(${Math.max(criteria.length, 1)}, minmax(0, 1fr))`,
                  }}
                >
                  {criteria.map((criterion) => (
                    <label
                      key={criterion.id}
                      className="flex min-w-0 flex-col gap-1.5 text-sm"
                    >
                      <span className="truncate text-zinc-700 dark:text-zinc-300">
                        {criterion.label}
                      </span>
                      <select
                        value={
                          draft.criterionScores[criterion.id] ??
                          Math.min(7, criterion.maxScore)
                        }
                        disabled={!isOpen || isBusy}
                        onChange={(e) => {
                          const nextScore = Number(e.target.value);
                          setDrafts((prev) => ({
                            ...prev,
                            [mate.id]: {
                              comment: prev[mate.id]?.comment ?? "",
                              criterionScores: {
                                ...(prev[mate.id]?.criterionScores ??
                                  buildDefaultScores(project)),
                                [criterion.id]: nextScore,
                              },
                            },
                          }));
                        }}
                        className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {Array.from(
                          {
                            length:
                              criterion.maxScore - PEER_EVALUATION_MIN_SCORE + 1,
                          },
                          (_, index) => PEER_EVALUATION_MIN_SCORE + index,
                        ).map((value) => (
                          <option key={value} value={value}>
                            {value}점
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="block flex-1 text-sm">
                    <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                      코멘트 (선택, 관리자만 확인)
                    </span>
                    <input
                      type="text"
                      value={draft.comment}
                      maxLength={500}
                      disabled={!isOpen || isBusy}
                      onChange={(e) => {
                        const nextComment = e.target.value;
                        setDrafts((prev) => ({
                          ...prev,
                          [mate.id]: {
                            criterionScores:
                              prev[mate.id]?.criterionScores ??
                              buildDefaultScores(project),
                            comment: nextComment,
                          },
                        }));
                      }}
                      placeholder="간단한 피드백"
                      className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>

                  {isOpen ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => handleSave(mate.id)}
                        disabled={isBusy}
                      >
                        {isSaving
                          ? "저장 중..."
                          : saved
                            ? "수정 저장"
                            : "제출"}
                      </Button>
                      {saved ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCancelSubmission(mate.id)}
                          disabled={isBusy}
                          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          {isCanceling ? "취소 중..." : "제출 취소"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {errorMessage ? (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {errorMessage}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
