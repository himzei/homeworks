"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DRAG_MIME,
  getUnassignedStudents,
  parseSeatingDrag,
  serializeSeatingDrag,
  type SeatingDragPayload,
} from "@/lib/seating-drag";

type SeatingStudentRosterProps = {
  roster: string[];
  seatAssignments: Record<string, string>;
  groupLabel: string;
  onDropFromDesk: (payload: SeatingDragPayload) => void;
  className?: string;
};

/**
 * 미배치 학생 명단 — 드래그하여 책상에 배치
 */
export default function SeatingStudentRoster({
  roster,
  seatAssignments,
  groupLabel,
  onDropFromDesk,
  className,
}: SeatingStudentRosterProps) {
  const unassigned = getUnassignedStudents(roster, seatAssignments);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const raw =
      event.dataTransfer.getData(DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");
    const payload = parseSeatingDrag(raw);
    if (payload) onDropFromDesk(payload);
  };

  return (
    <aside
      className={cn(
        "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4",
        isDragOver && "ring-2 ring-blue-500 border-blue-400",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="size-4 text-zinc-500" aria-hidden />
        <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
          {groupLabel} 명단
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          ({unassigned.length}/{roster.length}명 미배치)
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        이름을 드래그해 책상에 놓으세요. 책상에서 다시 끌어오면 배치가
        해제됩니다.
      </p>

      {roster.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
          불러온 학생이 없습니다.
        </p>
      ) : unassigned.length === 0 ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 py-4 text-center">
          모든 학생이 배치되었습니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
          {unassigned.map((name) => (
            <li key={name}>
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  const payload = serializeSeatingDrag({
                    type: "student",
                    name,
                  });
                  event.dataTransfer.setData(DRAG_MIME, payload);
                  event.dataTransfer.setData("text/plain", payload);
                  event.dataTransfer.effectAllowed = "move";
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium cursor-grab active:cursor-grabbing",
                  "border border-zinc-300 dark:border-zinc-600",
                  "bg-zinc-50 dark:bg-zinc-900 text-black dark:text-zinc-50",
                  "hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-400",
                  "transition-colors select-none",
                )}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
