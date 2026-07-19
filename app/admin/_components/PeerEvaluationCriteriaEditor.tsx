"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  PEER_EVALUATION_MAX_SCORE,
  PEER_EVALUATION_MIN_SCORE,
} from "@/lib/peer-evaluation/constants";
import {
  createEmptyPeerEvaluationCriterion,
  DEFAULT_PEER_EVALUATION_CRITERIA,
  PEER_EVALUATION_MAX_CRITERIA,
  PEER_EVALUATION_MIN_CRITERIA,
} from "@/lib/peer-evaluation/criteria";
import type { PeerEvaluationCriterion } from "@/lib/peer-evaluation/types";

type Props = {
  criteria: PeerEvaluationCriterion[];
  onChange: (next: PeerEvaluationCriterion[]) => void;
  disabled?: boolean;
};

const inputClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";

/**
 * 관리자용 평가항목 편집기 (추가·삭제·이름·최고점)
 */
export default function PeerEvaluationCriteriaEditor({
  criteria,
  onChange,
  disabled = false,
}: Props) {
  const updateCriterion = (
    index: number,
    patch: Partial<PeerEvaluationCriterion>,
  ) => {
    onChange(
      criteria.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeCriterion = (index: number) => {
    if (criteria.length <= PEER_EVALUATION_MIN_CRITERIA) return;
    onChange(
      criteria
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, sortOrder) => ({ ...item, sortOrder })),
    );
  };

  const addCriterion = () => {
    if (criteria.length >= PEER_EVALUATION_MAX_CRITERIA) return;
    onChange([
      ...criteria,
      createEmptyPeerEvaluationCriterion(criteria.length),
    ]);
  };

  const resetToDefault = () => {
    onChange(DEFAULT_PEER_EVALUATION_CRITERIA.map((item) => ({ ...item })));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            평가항목
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {PEER_EVALUATION_MIN_CRITERIA}~{PEER_EVALUATION_MAX_CRITERIA}개 ·
            각 항목 {PEER_EVALUATION_MIN_SCORE}~
            {PEER_EVALUATION_MAX_SCORE}점
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={resetToDefault}
        >
          기본 항목으로
        </Button>
      </div>

      <ul className="space-y-2">
        {criteria.map((criterion, index) => (
          <li
            key={criterion.id}
            className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_100px_auto] sm:items-end dark:border-zinc-800"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                항목 이름
              </span>
              <input
                type="text"
                value={criterion.label}
                maxLength={40}
                disabled={disabled}
                placeholder={`예: 참여도`}
                onChange={(e) =>
                  updateCriterion(index, { label: e.target.value })
                }
                className={inputClassName}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
                최고점
              </span>
              <select
                value={criterion.maxScore}
                disabled={disabled}
                onChange={(e) =>
                  updateCriterion(index, {
                    maxScore: Number(e.target.value),
                  })
                }
                className={inputClassName}
              >
                {Array.from(
                  {
                    length:
                      PEER_EVALUATION_MAX_SCORE -
                      PEER_EVALUATION_MIN_SCORE +
                      1,
                  },
                  (_, offset) => PEER_EVALUATION_MIN_SCORE + offset,
                ).map((value) => (
                  <option key={value} value={value}>
                    {value}점
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={
                disabled || criteria.length <= PEER_EVALUATION_MIN_CRITERIA
              }
              onClick={() => removeCriterion(index)}
              className="text-red-600 hover:text-red-700"
              aria-label={`${criterion.label || "항목"} 삭제`}
            >
              <Trash2 className="size-4" aria-hidden />
              삭제
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || criteria.length >= PEER_EVALUATION_MAX_CRITERIA}
        onClick={addCriterion}
      >
        <Plus className="size-4" aria-hidden />
        항목 추가
      </Button>
    </div>
  );
}
