"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { useAdmin } from "@/lib/auth/SessionProvider";
import { isExamOrMiniProjectFieldTitle } from "@/lib/evaluation/classify-extra-field";
import {
  EXAM_LETTER_GRADES,
  EXAM_SCORING_METHOD_LABEL,
  EXAM_SCORING_METHODS,
  parseExamLetterGrade,
  parseExamScoringMethod,
  scoreFromExamLetterGrade,
  type ExamLetterGrade,
  type ExamScoringMethod,
} from "@/lib/evaluation/exam-letter-grade";
import { isAbortError } from "@/lib/errors/is-abort-error";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ExamMiniProjectEvaluationTabProps = {
  selectedGroup: string | null;
};

type EvaluationField = {
  id: string;
  title: string;
  group_name: string | null;
  sort_order: number;
  field_date: string | null;
  scoring_method?: ExamScoringMethod | null;
  created_at: string;
};

type StudentRow = {
  id: string;
  name: string;
};

function dateToInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFieldDateInputValue(field: EvaluationField): string {
  if (field.field_date) return field.field_date.slice(0, 10);
  return dateToInputValue(new Date(field.created_at));
}

/** 평가일 오름차순 (같으면 생성일·제목 순) */
function sortFieldsByEvaluationDateAsc(
  fields: EvaluationField[],
): EvaluationField[] {
  return fields.toSorted((fieldA, fieldB) => {
    const dateA = getFieldDateInputValue(fieldA);
    const dateB = getFieldDateInputValue(fieldB);
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const createdCompare = fieldA.created_at.localeCompare(fieldB.created_at);
    if (createdCompare !== 0) return createdCompare;

    return fieldA.title.localeCompare(fieldB.title, "ko");
  });
}

function scoreKey(userId: string, fieldId: string): string {
  return `${userId}:${fieldId}`;
}

/**
 * 시험평가 및 미니프로젝트평가 — 필드 생성·점수 입력
 * (최종평가의 동일 섹션에 자동 반영)
 */
export default function ExamMiniProjectEvaluationTab({
  selectedGroup,
}: ExamMiniProjectEvaluationTabProps) {
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const supabase = useMemo(() => createClient(), []);

  const [fields, setFields] = useState<EvaluationField[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, ExamLetterGrade | null>>(
    {},
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => dateToInputValue(new Date()));
  const [newScoringMethod, setNewScoringMethod] =
    useState<ExamScoringMethod>("score");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [savingScoreKey, setSavingScoreKey] = useState<string | null>(null);

  const loadData = useCallback(
    async (signal: AbortSignal) => {
      if (!selectedGroup) {
        setFields([]);
        setStudents([]);
        setScores({});
        setGrades({});
        setComments({});
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const groupQuery = `?group=${encodeURIComponent(selectedGroup)}`;
        const [fieldsResponse, profilesResult] = await Promise.all([
          fetch(`/api/admin/evaluation-fields${groupQuery}`, { signal }),
          supabase
            .from("profiles")
            .select("id, name, role")
            .eq("approval_status", "approved")
            .eq("is_dormant", false)
            .eq("group_name", selectedGroup)
            .order("name", { ascending: true }),
        ]);

        if (signal.aborted) return;

        const fieldsPayload = (await fieldsResponse.json()) as {
          fields?: EvaluationField[];
          error?: string;
        };

        if (!fieldsResponse.ok) {
          const missingColumn =
            fieldsPayload.error?.includes("scoring_method") ?? false;
          setLoadError(
            missingColumn
              ? "scoring_method 컬럼이 없습니다. Supabase 마이그레이션을 적용해 주세요."
              : (fieldsPayload.error ?? "필드 목록을 불러오지 못했습니다."),
          );
          setFields([]);
          setStudents([]);
          setScores({});
          setGrades({});
          setComments({});
          return;
        }

        if (profilesResult.error) {
          console.error("학생 목록 조회 실패:", profilesResult.error);
          setLoadError("학생 목록을 불러오지 못했습니다.");
          return;
        }

        const examFields = sortFieldsByEvaluationDateAsc(
          (fieldsPayload.fields ?? []).filter((field) =>
            isExamOrMiniProjectFieldTitle(field.title),
          ),
        );
        setFields(examFields);

        const studentRows = (profilesResult.data ?? [])
          .filter((profile) => profile.role !== "admin")
          .map((profile) => ({
            id: profile.id,
            name: (profile.name ?? "").trim() || "이름 없음",
          }));
        setStudents(studentRows);

        if (examFields.length === 0 || studentRows.length === 0) {
          setScores({});
          setGrades({});
          setComments({});
          return;
        }

        const { data: scoreRows, error: scoresError } = await supabase
          .from("evaluation_extra_scores")
          .select("user_id, field_id, score, comment, grade")
          .in(
            "field_id",
            examFields.map((field) => field.id),
          )
          .in(
            "user_id",
            studentRows.map((student) => student.id),
          );

        if (signal.aborted) return;

        if (scoresError) {
          console.error("점수 조회 실패:", scoresError);
          const message =
            scoresError.message?.includes("grade") ||
            scoresError.message?.includes("comment")
              ? "grade/comment 컬럼이 없습니다. Supabase 마이그레이션을 적용해 주세요."
              : "평가 데이터를 불러오지 못했습니다.";
          setLoadError(message);
          setScores({});
          setGrades({});
          setComments({});
          return;
        }

        const nextScores: Record<string, number> = {};
        const nextGrades: Record<string, ExamLetterGrade | null> = {};
        const nextComments: Record<string, string> = {};
        for (const row of scoreRows ?? []) {
          const key = scoreKey(row.user_id, row.field_id);
          nextScores[key] =
            typeof row.score === "number" && Number.isFinite(row.score)
              ? row.score
              : 0;
          // DB에 저장된 등급만 표시 (점수만 있으면 등급 미선택)
          nextGrades[key] = parseExamLetterGrade(row.grade);
          nextComments[key] =
            typeof row.comment === "string" ? row.comment : "";
        }
        setScores(nextScores);
        setGrades(nextGrades);
        setComments(nextComments);
      } catch (error) {
        if (isAbortError(error)) return;
        console.error("시험·미니프로젝트 평가 로드 실패:", error);
        setLoadError("데이터를 불러오는 중 오류가 발생했습니다.");
        setFields([]);
        setStudents([]);
        setScores({});
        setGrades({});
        setComments({});
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [selectedGroup, supabase],
  );

  useEffect(() => {
    if (isCheckingAdmin || !isAdmin) return;
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [isCheckingAdmin, isAdmin, loadData]);

  const handleAddField = async () => {
    if (!selectedGroup) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setActionError("항목 이름을 입력해 주세요.");
      return;
    }
    if (!isExamOrMiniProjectFieldTitle(trimmedTitle)) {
      setActionError(
        "제목에 「시험」 또는 「미니프로젝트」를 포함해 주세요. (예: 중간시험, 미니프로젝트)",
      );
      return;
    }
    if (!newDate) {
      setActionError("평가일을 선택해 주세요.");
      return;
    }

    setIsAdding(true);
    setActionError(null);

    try {
      const response = await fetch("/api/admin/evaluation-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          groupName: selectedGroup,
          fieldDate: newDate,
          scoringMethod: newScoringMethod,
        }),
      });
      const payload = (await response.json()) as {
        field?: EvaluationField;
        error?: string;
      };

      if (!response.ok || !payload.field) {
        setActionError(payload.error ?? "항목 추가에 실패했습니다.");
        return;
      }

      setFields((prev) =>
        sortFieldsByEvaluationDateAsc([...prev, payload.field!]),
      );
      setNewTitle("");
      setNewDate(dateToInputValue(new Date()));
      setNewScoringMethod("score");
    } catch (error) {
      console.error("항목 추가 실패:", error);
      setActionError("항목 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteField = async (field: EvaluationField) => {
    if (
      !window.confirm(
        `"${field.title}" 항목을 삭제할까요?\n연결된 평가(등급·코멘트)도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }

    setDeletingFieldId(field.id);
    setActionError(null);

    try {
      const params = new URLSearchParams({ id: field.id });
      if (selectedGroup) params.set("group", selectedGroup);

      const response = await fetch(
        `/api/admin/evaluation-fields?${params.toString()}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setActionError(payload.error ?? "삭제에 실패했습니다.");
        return;
      }

      setFields((prev) => prev.filter((item) => item.id !== field.id));
      setScores((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.endsWith(`:${field.id}`)) delete next[key];
        }
        return next;
      });
      setGrades((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.endsWith(`:${field.id}`)) delete next[key];
        }
        return next;
      });
      setComments((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (key.endsWith(`:${field.id}`)) delete next[key];
        }
        return next;
      });
    } catch (error) {
      console.error("항목 삭제 실패:", error);
      setActionError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingFieldId(null);
    }
  };

  const handleUpdateFieldDate = async (fieldId: string, fieldDate: string) => {
    if (!fieldDate) return;
    setActionError(null);

    const previous = fields;
    setFields((prev) =>
      sortFieldsByEvaluationDateAsc(
        prev.map((field) =>
          field.id === fieldId ? { ...field, field_date: fieldDate } : field,
        ),
      ),
    );

    try {
      const response = await fetch("/api/admin/evaluation-fields", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          fieldDate,
          groupName: selectedGroup,
        }),
      });
      const payload = (await response.json()) as {
        field?: EvaluationField;
        error?: string;
      };

      if (!response.ok || !payload.field) {
        setFields(previous);
        setActionError(payload.error ?? "날짜 저장에 실패했습니다.");
        return;
      }

      setFields((prev) =>
        sortFieldsByEvaluationDateAsc(
          prev.map((field) => (field.id === fieldId ? payload.field! : field)),
        ),
      );
    } catch (error) {
      console.error("날짜 저장 실패:", error);
      setFields(previous);
      setActionError("날짜 저장 중 오류가 발생했습니다.");
    }
  };

  const handleSaveScore = async (
    userId: string,
    fieldId: string,
    rawValue: string,
  ) => {
    const parsed = Number.parseInt(rawValue, 10);
    const score = Number.isFinite(parsed)
      ? Math.min(999, Math.max(0, parsed))
      : 0;
    const key = scoreKey(userId, fieldId);
    const previousScore = scores[key] ?? 0;
    const previousGrade = grades[key] ?? null;

    if (previousScore === score && previousGrade === null) return;

    setSavingScoreKey(key);
    setScores((prev) => ({ ...prev, [key]: score }));
    // 숫자 채점 시 등급은 해제 (둘 중 하나로 명확히)
    setGrades((prev) => ({ ...prev, [key]: null }));
    setActionError(null);

    try {
      const response = await fetch("/api/admin/evaluation-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fieldId, score, grade: null }),
      });
      const payload = (await response.json()) as {
        score?: number;
        grade?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setScores((prev) => ({ ...prev, [key]: previousScore }));
        setGrades((prev) => ({ ...prev, [key]: previousGrade }));
        setActionError(payload.error ?? "점수 저장에 실패했습니다.");
        return;
      }

      if (typeof payload.score === "number") {
        setScores((prev) => ({ ...prev, [key]: payload.score! }));
      }
      setGrades((prev) => ({
        ...prev,
        [key]: parseExamLetterGrade(payload.grade),
      }));
    } catch (error) {
      console.error("점수 저장 실패:", error);
      setScores((prev) => ({ ...prev, [key]: previousScore }));
      setGrades((prev) => ({ ...prev, [key]: previousGrade }));
      setActionError("점수 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingScoreKey(null);
    }
  };

  const handleSaveGrade = async (
    userId: string,
    fieldId: string,
    nextGrade: ExamLetterGrade | null,
  ) => {
    const key = scoreKey(userId, fieldId);
    const previousGrade = grades[key] ?? null;
    const previousScore = scores[key] ?? 0;

    // 같은 등급을 다시 누르면 선택 해제 (점수는 유지)
    const resolvedGrade =
      previousGrade !== null && previousGrade === nextGrade ? null : nextGrade;

    if (previousGrade === resolvedGrade) return;

    const nextScore =
      resolvedGrade !== null
        ? scoreFromExamLetterGrade(resolvedGrade)
        : previousScore;

    setSavingScoreKey(key);
    setGrades((prev) => ({ ...prev, [key]: resolvedGrade }));
    setScores((prev) => ({ ...prev, [key]: nextScore }));
    setActionError(null);

    try {
      const response = await fetch("/api/admin/evaluation-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fieldId, grade: resolvedGrade }),
      });
      const payload = (await response.json()) as {
        grade?: string | null;
        score?: number;
        error?: string;
      };

      if (!response.ok) {
        setGrades((prev) => ({ ...prev, [key]: previousGrade }));
        setScores((prev) => ({ ...prev, [key]: previousScore }));
        setActionError(payload.error ?? "등급 저장에 실패했습니다.");
        return;
      }

      setGrades((prev) => ({
        ...prev,
        [key]: parseExamLetterGrade(payload.grade),
      }));
      if (typeof payload.score === "number") {
        setScores((prev) => ({ ...prev, [key]: payload.score! }));
      }
    } catch (error) {
      console.error("등급 저장 실패:", error);
      setGrades((prev) => ({ ...prev, [key]: previousGrade }));
      setScores((prev) => ({ ...prev, [key]: previousScore }));
      setActionError("등급 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingScoreKey(null);
    }
  };

  const handleSaveComment = async (
    userId: string,
    fieldId: string,
    rawComment: string,
  ) => {
    const key = scoreKey(userId, fieldId);
    const nextComment = rawComment.trim();
    const previous = comments[key] ?? "";

    if (previous === nextComment) return;

    setSavingScoreKey(key);
    setComments((prev) => ({ ...prev, [key]: nextComment }));
    setActionError(null);

    try {
      const response = await fetch("/api/admin/evaluation-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fieldId,
          comment: nextComment,
        }),
      });
      const payload = (await response.json()) as {
        comment?: string | null;
        error?: string;
      };

      if (!response.ok) {
        setComments((prev) => ({ ...prev, [key]: previous }));
        setActionError(payload.error ?? "코멘트 저장에 실패했습니다.");
        return;
      }

      setComments((prev) => ({
        ...prev,
        [key]: payload.comment ?? "",
      }));
    } catch (error) {
      console.error("코멘트 저장 실패:", error);
      setComments((prev) => ({ ...prev, [key]: previous }));
      setActionError("코멘트 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingScoreKey(null);
    }
  };

  if (isCheckingAdmin) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">권한 확인 중...</p>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
        관리자만 이용할 수 있습니다.
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        상단에서 기수(과정)를 선택해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        제목에 <strong>시험</strong> 또는 <strong>미니프로젝트</strong>가 포함된
        항목만 이 탭에 표시됩니다. 항목 추가 시{" "}
        <strong>점수 채점</strong> 또는 <strong>등급 평가(A~F)</strong>를
        선택하세요. 등급 환산: A100 · B80 · C60 · D40 · F0.
      </div>

      {actionError ? (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          평가 항목 추가
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            항목명
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleAddField();
              }}
              maxLength={50}
              placeholder="예: 중간시험, 미니프로젝트(데이터 크롤링)"
              disabled={isAdding}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            평가일
            <input
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              disabled={isAdding}
              className="mt-1 block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <fieldset className="space-y-1">
            <legend className="text-xs text-zinc-600 dark:text-zinc-400">
              평가방법
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {EXAM_SCORING_METHODS.map((method) => {
                const isSelected = newScoringMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={isAdding}
                    aria-pressed={isSelected}
                    onClick={() => setNewScoringMethod(method)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-amber-600 bg-amber-500 text-white"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
                    )}
                  >
                    {EXAM_SCORING_METHOD_LABEL[method]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button
            type="button"
            size="sm"
            disabled={isAdding}
            onClick={() => void handleAddField()}
          >
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            추가
          </Button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {loadError}
        </div>
      ) : fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          등록된 시험·미니프로젝트 항목이 없습니다. 위에서 항목을 추가해
          주세요.
        </div>
      ) : (
        <>
          <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              평가 항목 ({fields.length})
            </h2>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {fields.map((field) => {
                const scoringMethod = parseExamScoringMethod(
                  field.scoring_method,
                );
                return (
                  <li
                    key={field.id}
                    className="flex flex-wrap items-center gap-2 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {field.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        scoringMethod === "grade"
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                          : "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
                      )}
                    >
                      {EXAM_SCORING_METHOD_LABEL[scoringMethod]}
                    </span>
                    <input
                      type="date"
                      value={getFieldDateInputValue(field)}
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        if (nextDate === getFieldDateInputValue(field)) return;
                        void handleUpdateFieldDate(field.id, nextDate);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      aria-label={`${field.title} 평가일`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={deletingFieldId === field.id}
                      onClick={() => void handleDeleteField(field)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      삭제
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>

          {students.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              이 기수에 등록된 학생이 없습니다.
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="overflow-x-auto">
                <table className="min-w-max border-collapse text-sm">
                  <thead>
                    <tr className="bg-amber-100/70 dark:bg-amber-900/30">
                      <th className="sticky left-0 z-10 min-w-[5rem] border-r border-amber-200 bg-amber-100/90 px-3 py-2 text-left font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100">
                        학생
                      </th>
                      {fields.map((field) => {
                        const scoringMethod = parseExamScoringMethod(
                          field.scoring_method,
                        );
                        return (
                          <th
                            key={field.id}
                            className="min-w-[14rem] border-r border-amber-200 px-2 py-2 text-center font-medium text-amber-950 dark:border-amber-800 dark:text-amber-100"
                            title={field.title}
                          >
                            <span className="block text-[11px] tabular-nums opacity-80">
                              {getFieldDateInputValue(field)}
                            </span>
                            <span className="mt-0.5 block max-w-[12rem] truncate text-xs">
                              {field.title}
                            </span>
                            <span className="mt-1 block text-[10px] font-normal opacity-70">
                              {EXAM_SCORING_METHOD_LABEL[scoringMethod]}
                            </span>
                          </th>
                        );
                      })}
                      {fields.some(
                        (field) =>
                          parseExamScoringMethod(field.scoring_method) ===
                          "score",
                      ) ? (
                        <th className="min-w-[4rem] px-2 py-2 text-center font-semibold text-amber-950 dark:text-amber-100">
                          합계
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      // 등급 평가 항목은 합계 점수에 포함하지 않음
                      const scoreFields = fields.filter(
                        (field) =>
                          parseExamScoringMethod(field.scoring_method) ===
                          "score",
                      );
                      const rowTotal = scoreFields.reduce(
                        (sum, field) =>
                          sum + (scores[scoreKey(student.id, field.id)] ?? 0),
                        0,
                      );
                      const showRowTotal = scoreFields.length > 0;

                      return (
                        <tr
                          key={student.id}
                          className="border-t border-amber-100 bg-white dark:border-amber-900/40 dark:bg-zinc-950"
                        >
                          <td className="sticky left-0 z-10 border-r border-amber-100 bg-white px-3 py-1.5 font-medium text-zinc-900 dark:border-amber-900/40 dark:bg-zinc-950 dark:text-zinc-50">
                            {student.name}
                          </td>
                          {fields.map((field) => {
                            const key = scoreKey(student.id, field.id);
                            const scoreValue = scores[key] ?? 0;
                            const selectedGrade = grades[key] ?? null;
                            const commentValue = comments[key] ?? "";
                            const isSaving = savingScoreKey === key;
                            const scoringMethod = parseExamScoringMethod(
                              field.scoring_method,
                            );
                            const usesGrade = scoringMethod === "grade";

                            return (
                              <td
                                key={field.id}
                                className="border-r border-amber-100 px-1.5 py-1.5 align-top dark:border-amber-900/40"
                              >
                                <div className="flex flex-col gap-1.5">
                                  {usesGrade ? (
                                    <div
                                      role="group"
                                      aria-label={`${student.name} ${field.title} 등급`}
                                      className="flex flex-wrap gap-1"
                                    >
                                      {EXAM_LETTER_GRADES.map((gradeOption) => {
                                        const isSelected =
                                          selectedGrade === gradeOption;
                                        return (
                                          <button
                                            key={gradeOption}
                                            type="button"
                                            disabled={isSaving}
                                            aria-pressed={isSelected}
                                            onClick={() =>
                                              void handleSaveGrade(
                                                student.id,
                                                field.id,
                                                gradeOption,
                                              )
                                            }
                                            className={cn(
                                              "inline-flex h-7 w-7 items-center justify-center rounded border text-xs font-bold transition-colors",
                                              isSelected
                                                ? "border-amber-600 bg-amber-500 text-white shadow-sm"
                                                : "border-zinc-300 bg-white text-zinc-700 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-amber-500",
                                              isSaving && "opacity-60",
                                            )}
                                          >
                                            {gradeOption}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      min={0}
                                      max={999}
                                      inputMode="numeric"
                                      defaultValue={scoreValue}
                                      key={`${key}:score:${scoreValue}`}
                                      disabled={isSaving}
                                      onBlur={(event) =>
                                        void handleSaveScore(
                                          student.id,
                                          field.id,
                                          event.target.value,
                                        )
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          (
                                            event.target as HTMLInputElement
                                          ).blur();
                                        }
                                      }}
                                      className={cn(
                                        "w-14 rounded border border-zinc-300 bg-white px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900",
                                        isSaving && "opacity-60",
                                      )}
                                      aria-label={`${student.name} ${field.title} 점수`}
                                      title="점수 채점"
                                    />
                                  )}
                                  <textarea
                                    defaultValue={commentValue}
                                    key={`${key}:comment:${commentValue}`}
                                    rows={2}
                                    maxLength={2000}
                                    disabled={isSaving}
                                    placeholder="코멘트"
                                    onBlur={(event) =>
                                      void handleSaveComment(
                                        student.id,
                                        field.id,
                                        event.target.value,
                                      )
                                    }
                                    className={cn(
                                      "min-w-[10rem] w-full resize-y rounded border border-zinc-300 bg-white px-1.5 py-1 text-[11px] leading-snug text-zinc-800 outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                                      isSaving && "opacity-60",
                                    )}
                                    aria-label={`${student.name} ${field.title} 코멘트`}
                                  />
                                </div>
                              </td>
                            );
                          })}
                          {showRowTotal ? (
                            <td className="bg-amber-50/60 px-2 py-1.5 text-center font-semibold tabular-nums text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                              {rowTotal}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
