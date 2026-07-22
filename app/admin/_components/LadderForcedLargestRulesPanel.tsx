"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { fetchGroupStudentNames } from "@/lib/fetch-group-students";
import { formatShortGroupLabel } from "@/lib/fetch-group-options";
import type { LadderGroupForcedLargestRule } from "@/lib/ladder-group-forced-largest";

type LadderForcedLargestRulesPanelProps = {
  /** 선택된 기수(과정명). null/"all" 이면 안내만 표시 */
  selectedGroup: string | null;
};

/**
 * 관리자 — 기수 공통 "가장 큰 조(5인 조) 고정" 규칙 편집
 */
export default function LadderForcedLargestRulesPanel({
  selectedGroup,
}: LadderForcedLargestRulesPanelProps) {
  const [rules, setRules] = useState<LadderGroupForcedLargestRule[]>([]);
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasGroup = Boolean(selectedGroup && selectedGroup !== "all");
  const shortGroupLabel = hasGroup
    ? formatShortGroupLabel(selectedGroup)
    : "";

  const loadRulesAndStudents = useCallback(async (groupName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rulesResponse, students] = await Promise.all([
        fetch(
          `/api/admin/ladder-forced-largest-rules?group=${encodeURIComponent(groupName)}`,
        ),
        fetchGroupStudentNames(createClient(), groupName),
      ]);

      if (!rulesResponse.ok) {
        throw new Error("rules_fetch_failed");
      }

      const json = (await rulesResponse.json()) as {
        rules?: LadderGroupForcedLargestRule[];
      };
      setRules(json.rules ?? []);
      setStudentNames(students);
      setSelectedName("");
    } catch (error) {
      console.error("기수 5인 조 고정 규칙 불러오기 실패:", error);
      setRules([]);
      setStudentNames([]);
      setErrorMessage("규칙을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasGroup || !selectedGroup) {
      setRules([]);
      setStudentNames([]);
      setErrorMessage(null);
      return;
    }
    void loadRulesAndStudents(selectedGroup);
  }, [hasGroup, selectedGroup, loadRulesAndStudents]);

  const registeredNames = useMemo(
    () => new Set(rules.map((rule) => rule.studentName)),
    [rules],
  );

  // 이미 등록된 학생은 선택 목록에서 제외
  const availableStudents = useMemo(
    () => studentNames.filter((name) => !registeredNames.has(name)),
    [studentNames, registeredNames],
  );

  const handleAdd = useCallback(async () => {
    if (!selectedGroup || !hasGroup) return;
    const trimmed = selectedName.trim();
    if (!trimmed) {
      setErrorMessage("학생을 선택해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/admin/ladder-forced-largest-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: selectedGroup,
          studentName: trimmed,
        }),
      });

      if (response.status === 409) {
        setErrorMessage("이미 등록된 학생입니다.");
        return;
      }
      if (!response.ok) {
        setErrorMessage("저장에 실패했습니다. 다시 시도해 주세요.");
        return;
      }

      const json = (await response.json()) as {
        rule?: LadderGroupForcedLargestRule;
      };
      if (json.rule) {
        setRules((prev) => [...prev, json.rule!]);
      } else {
        await loadRulesAndStudents(selectedGroup);
      }
      setSelectedName("");
    } catch (error) {
      console.error("5인 조 고정 추가 실패:", error);
      setErrorMessage("저장 중 문제가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }, [hasGroup, loadRulesAndStudents, selectedGroup, selectedName]);

  const handleRemove = useCallback(
    async (ruleId: string) => {
      if (!selectedGroup) return;
      setIsSaving(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/admin/ladder-forced-largest-rules", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: ruleId }),
        });
        if (!response.ok) {
          setErrorMessage("삭제에 실패했습니다. 다시 시도해 주세요.");
          return;
        }
        setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      } catch (error) {
        console.error("5인 조 고정 삭제 실패:", error);
        setErrorMessage("삭제 중 문제가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedGroup],
  );

  if (!hasGroup) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
        상단에서 기수를 선택하면, 해당 기수의{" "}
        <strong className="text-zinc-800 dark:text-zinc-100">
          5인 조 고정
        </strong>{" "}
        규칙을 설정할 수 있습니다.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-zinc-50">
          <Users className="size-5" aria-hidden />
          {shortGroupLabel} 5인 조 고정
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          지정한 학생은 이 기수로 만든 사다리게임에서 결과 칸이 가장 많은
          조(예: 5명 조)에 반드시 배정됩니다. 결과 칸에{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            1조
          </code>
          ×4 ·{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            2조
          </code>
          ×4 · … · 한 조만 ×5 로 넣어 주세요. (게임 시작 전 섞기·시작 시 적용)
        </p>
      </header>

      {isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          불러오는 중...
        </p>
      ) : (
        <>
          {rules.length > 0 ? (
            <ul className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-800 dark:text-zinc-100"
                >
                  <span>{rule.studentName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void handleRemove(rule.id)}
                    className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    해제
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              고정된 학생이 없습니다.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              학생
              <select
                className="h-9 min-w-40 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                value={selectedName}
                disabled={isSaving || availableStudents.length === 0}
                onChange={(event) => {
                  setSelectedName(event.target.value);
                  setErrorMessage(null);
                }}
              >
                <option value="">선택</option>
                {availableStudents.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={isSaving || availableStudents.length === 0}
              onClick={() => void handleAdd()}
            >
              5인 조 고정 추가
            </Button>
          </div>

          {studentNames.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              이 기수에 승인된 학생이 있어야 설정할 수 있습니다.
            </p>
          ) : availableStudents.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              모든 학생이 이미 등록되어 있습니다.
            </p>
          ) : null}

          {rules.length > 5 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              고정 학생이 5명을 넘으면 5인 조 슬롯보다 많을 수 있습니다. 결과
              칸의 가장 큰 조 인원 이하로 맞춰 주세요.
            </p>
          ) : null}
        </>
      )}

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
