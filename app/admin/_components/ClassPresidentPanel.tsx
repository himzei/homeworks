"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Crown, Users } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  CLASS_OFFICER_ROLE,
  findClassPresidentId,
  type ClassRoleStudent,
} from "@/lib/class-officers";
import { extractCourseShortLabel } from "@/lib/courses";

type ClassPresidentPanelProps = {
  groupName: string;
  students: ClassRoleStudent[];
};

const selectClassName =
  "min-w-[12rem] w-full sm:w-64 max-w-md rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * 목록 페이지 — 반장만 지정 (과정 중 변경 없음)
 */
export default function ClassPresidentPanel({
  groupName,
  students,
}: ClassPresidentPanelProps) {
  const router = useRouter();
  const cohortLabel = extractCourseShortLabel(groupName);

  const initialPresidentId = useMemo(
    () => findClassPresidentId(students),
    [students],
  );

  const [classPresidentId, setClassPresidentId] = useState(initialPresidentId);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setClassPresidentId(findClassPresidentId(students));
  }, [students, groupName]);

  const studentOptions = useMemo(
    () => students.toSorted((a, b) => a.name.localeCompare(b.name, "ko")),
    [students],
  );

  const handleSave = async () => {
    setFormError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/class-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          presidentOnly: true,
          classPresidentId,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFormError(result.error ?? "저장에 실패했습니다.");
        return;
      }

      setSaveMessage("반장이 저장되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("반장 저장 오류:", error);
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-950 mb-8">
        <Users className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          이 과정에 등록된 학생이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Crown className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            {cohortLabel} 반장
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors shrink-0"
          aria-expanded={isExpanded}
          aria-controls="class-president-panel-content"
          aria-label={isExpanded ? "반장 설정 접기" : "반장 설정 펴기"}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3.5 shrink-0" aria-hidden />
              접기
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5 shrink-0" aria-hidden />
              펴기
            </>
          )}
        </button>
      </div>

      {isExpanded ? (
        <div id="class-president-panel-content" className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        반장은 여기서 지정합니다. 반장도 조 편성 글쓰기에서 다른 학생과 같이
        조에 배치할 수 있습니다.
      </p>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {saveMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label
          htmlFor="class-president-select"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 shrink-0"
        >
          반장
        </label>
        <select
          id="class-president-select"
          value={classPresidentId ?? ""}
          onChange={(e) => {
            setClassPresidentId(e.target.value || null);
            setSaveMessage(null);
            setFormError(null);
          }}
          className={selectClassName}
        >
          <option value="">미지정</option>
          {studentOptions.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.classOfficerRole === CLASS_OFFICER_ROLE.CLASS_PRESIDENT
                ? " (현재 반장)"
                : ""}
            </option>
          ))}
        </select>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSaving ? "저장 중..." : "반장 저장"}
        </Button>
      </div>
        </div>
      ) : null}
    </section>
  );
}
