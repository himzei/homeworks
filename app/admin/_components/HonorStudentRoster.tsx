"use client";

import { useMemo } from "react";
import { GripVertical, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  HONOR_BADGES_DRAG_MIME,
  serializeHonorBadgesDrag,
} from "@/lib/honor-badges-drag";
import type { ClassRoleStudent } from "@/lib/class-officers";

type HonorStudentRosterProps = {
  cohortLabel: string;
  students: ClassRoleStudent[];
  className?: string;
};

/**
 * 명예 배지용 전체 학생 명단 (드래그 소스만 — 배정해도 명단에서 사라지지 않음)
 */
export default function HonorStudentRoster({
  cohortLabel,
  students,
  className,
}: HonorStudentRosterProps) {
  const sortedStudents = useMemo(
    () => students.toSorted((a, b) => a.name.localeCompare(b.name, "ko")),
    [students],
  );

  if (students.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        "rounded-xl border border-zinc-200 dark:border-zinc-800",
        "bg-white dark:bg-zinc-950 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-4 text-zinc-500" aria-hidden />
        <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
          {cohortLabel} 명단
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        전체 {sortedStudents.length}명 · 아래 배지로 끌어다 놓으세요. 한 학생에게
        여러 배지를 줄 수 있습니다.
      </p>
      <ul className="flex flex-wrap gap-2 max-h-[min(40vh,360px)] overflow-y-auto">
        {sortedStudents.map((student) => (
          <li key={student.id}>
            <div
              draggable
              onDragStart={(event) => {
                const serialized = serializeHonorBadgesDrag({
                  type: "student",
                  studentId: student.id,
                });
                event.dataTransfer.setData(HONOR_BADGES_DRAG_MIME, serialized);
                event.dataTransfer.setData("text/plain", serialized);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium",
                "cursor-grab active:cursor-grabbing select-none border transition-colors",
                "border-zinc-300 bg-zinc-50 text-zinc-900",
                "dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100",
                "hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
              )}
            >
              <GripVertical className="size-3.5 shrink-0 opacity-40" aria-hidden />
              <span className="truncate max-w-[120px]">{student.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
