"use client";

import { useState } from "react";
import Link from "next/link";

import { buildSeatKey } from "@/lib/seating";
import {
  DRAG_MIME,
  parseSeatingDrag,
  serializeSeatingDrag,
  type SeatingDragPayload,
} from "@/lib/seating-drag";
import { cn } from "@/lib/utils";

type SeatingGridProps = {
  rowCount: number;
  colCount: number;
  /** 해당 열(1-based) 뒤에 통로 삽입 */
  aisleAfterColumns: number[];
  seatAssignments: Record<string, string>;
  /** true면 학생 이름 입력·드래그 가능 */
  editable?: boolean;
  /** 드래그앤드롭으로 좌석 배치 */
  dragDropEnabled?: boolean;
  onSeatChange?: (seatKey: string, studentName: string) => void;
  onSeatDrop?: (seatKey: string, payload: SeatingDragPayload) => void;
  /** 이름 클릭 시 프로필 이동용 (상세보기) */
  profileIdByName?: Record<string, string>;
  className?: string;
};

/**
 * 자리배치도 그리드 — 좌석(작은 원) + 책상(흰색 사각형, 이름 표시)
 * 칠판은 하단(전면)에 배치 · 기본 대비 1.5배 크기
 */
export default function SeatingGrid({
  rowCount,
  colCount,
  aisleAfterColumns,
  seatAssignments,
  editable = false,
  dragDropEnabled = false,
  onSeatChange,
  onSeatDrop,
  profileIdByName,
  className,
}: SeatingGridProps) {
  const aisleSet = new Set(aisleAfterColumns);

  return (
    <div
      className={cn(
        "inline-flex flex-col gap-[1.125rem] p-6 sm:p-9 bg-zinc-100 dark:bg-zinc-900 rounded-xl border-2 border-black",
        className,
      )}
      role="grid"
      aria-label={`${rowCount}행 ${colCount}열 자리배치도`}
    >
      {Array.from({ length: rowCount }, (_, rowIndex) => {
        const row = rowIndex + 1;
        return (
          <div
            key={row}
            className="flex items-end justify-center gap-0"
            role="row"
          >
            {Array.from({ length: colCount }, (_, colIndex) => {
              const col = colIndex + 1;
              const seatKey = buildSeatKey(row, col);
              const studentName = seatAssignments[seatKey] ?? "";

              return (
                <div key={col} className="flex items-end" role="gridcell">
                  <DeskUnit
                    seatKey={seatKey}
                    row={row}
                    col={col}
                    studentName={studentName}
                    profileId={profileIdByName?.[studentName.trim()]}
                    editable={editable}
                    dragDropEnabled={dragDropEnabled}
                    onNameChange={(name) => onSeatChange?.(seatKey, name)}
                    onDrop={(payload) => onSeatDrop?.(seatKey, payload)}
                  />
                  {aisleSet.has(col) ? (
                    <div className="w-12 sm:w-[4.5rem] shrink-0" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="w-full py-3 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 border-t-2 border-black">
        칠판
      </div>
    </div>
  );
}

type DeskUnitProps = {
  seatKey: string;
  row: number;
  col: number;
  studentName: string;
  profileId?: string;
  editable: boolean;
  dragDropEnabled: boolean;
  onNameChange: (name: string) => void;
  onDrop: (payload: SeatingDragPayload) => void;
};

/** 좌석 원 + 책상(이름 입력·드롭) */
function DeskUnit({
  seatKey,
  row,
  col,
  studentName,
  profileId,
  editable,
  dragDropEnabled,
  onNameChange,
  onDrop,
}: DeskUnitProps) {
  const seatLabel = `${row}행 ${col}열`;
  const [isDragOver, setIsDragOver] = useState(false);
  const trimmedName = studentName.trim();
  const canDragFromDesk = dragDropEnabled && trimmedName.length > 0;

  const handleDragOver = (event: React.DragEvent) => {
    if (!dragDropEnabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!dragDropEnabled) return;
    event.preventDefault();
    setIsDragOver(false);
    const raw =
      event.dataTransfer.getData(DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");
    const payload = parseSeatingDrag(raw);
    if (payload) onDrop(payload);
  };

  const handleDeskDragStart = (event: React.DragEvent) => {
    if (!canDragFromDesk) {
      event.preventDefault();
      return;
    }
    const payload = serializeSeatingDrag({
      type: "desk",
      seatKey,
      name: trimmedName,
    });
    event.dataTransfer.setData(DRAG_MIME, payload);
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex flex-col items-center w-[5.25rem] sm:w-24">
      <div
        className="w-[1.875rem] h-[1.875rem] sm:w-[2.25rem] sm:h-[2.25rem] rounded-full border-2 border-black bg-brand-footer shrink-0"
        aria-hidden
      />

      {editable ? (
        <div
          draggable={canDragFromDesk}
          onDragStart={handleDeskDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "w-full mt-1 rounded-sm",
            canDragFromDesk && "cursor-grab active:cursor-grabbing",
            isDragOver && "ring-2 ring-blue-500 ring-offset-1",
          )}
        >
          <input
            type="text"
            value={studentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="이름"
            aria-label={`${seatLabel} 학생 이름`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={cn(
              "w-full h-12 sm:h-[3.375rem] border-2 border-black rounded-sm text-center text-xs sm:text-sm pointer-events-auto",
              "bg-white text-black placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              isDragOver && "border-blue-500",
            )}
            maxLength={20}
          />
        </div>
      ) : (
        <div
          className={cn(
            "w-full h-12 sm:h-[3.375rem] mt-1 border-2 border-black rounded-sm flex items-center justify-center",
            "bg-white text-xs sm:text-sm font-medium px-1",
            !trimmedName && "text-zinc-500",
          )}
          title={trimmedName || "빈 좌석"}
        >
          {trimmedName && profileId ? (
            <Link
              href={`/user/${profileId}`}
              className="truncate max-w-full leading-tight text-blue-600 dark:text-blue-400 hover:underline"
            >
              {trimmedName}
            </Link>
          ) : (
            <span
              className={cn(
                "truncate max-w-full leading-tight",
                trimmedName ? "text-black" : "",
              )}
            >
              {trimmedName || "—"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
