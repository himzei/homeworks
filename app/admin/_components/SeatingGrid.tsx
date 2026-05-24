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
import type { StudentOfficerInfo } from "@/lib/class-officers";
import { cn } from "@/lib/utils";

import ClassOfficerBadge from "./ClassOfficerBadge";

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
  /** 학생 이름 → 반·조 (책상 우측 상단 배지) */
  officerByStudentName?: Record<string, StudentOfficerInfo>;
  className?: string;
};

/**
 * 자리배치도 그리드 — 좌석(작은 원) + 책상(흰색 사각형, 이름 표시)
 * 칠판은 하단(전면)에 배치
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
  officerByStudentName,
  className,
}: SeatingGridProps) {
  const aisleSet = new Set(aisleAfterColumns);

  return (
    <div
      className={cn(
        "inline-flex flex-col gap-6 p-7 sm:p-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl border-2 border-black",
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
              const trimmedStudentName = studentName.trim();
              const officerInfo = trimmedStudentName
                ? officerByStudentName?.[trimmedStudentName]
                : undefined;

              return (
                <div key={col} className="flex items-end" role="gridcell">
                  <DeskUnit
                    seatKey={seatKey}
                    row={row}
                    col={col}
                    studentName={studentName}
                    officerInfo={officerInfo}
                    profileId={profileIdByName?.[trimmedStudentName]}
                    editable={editable}
                    dragDropEnabled={dragDropEnabled}
                    onNameChange={(name) => onSeatChange?.(seatKey, name)}
                    onDrop={(payload) => onSeatDrop?.(seatKey, payload)}
                  />
                  {aisleSet.has(col) ? (
                    <div className="w-16 sm:w-24 shrink-0" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="w-full py-4 text-center text-base font-semibold text-zinc-600 dark:text-zinc-400 border-t-2 border-black">
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
  officerInfo?: StudentOfficerInfo;
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
  officerInfo,
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

  /** 이름 바로 위에 겹침 — 레이아웃에는 영향 없음 */
  const officerBadge = officerInfo ? (
    <div className="absolute bottom-full left-1/2 z-10 mb-0 -translate-x-1/2 whitespace-nowrap pointer-events-none">
      <ClassOfficerBadge
        classOfficerRole={officerInfo.classOfficerRole}
        teamNumber={officerInfo.teamNumber}
        isTeamLeader={officerInfo.isTeamLeader}
        honorBadgeLabels={officerInfo.honorBadgeLabels}
        showTeamBadges
        className="text-[10px] sm:text-xs px-1.5 py-0.5 font-medium leading-tight"
      />
    </div>
  ) : null;

  const deskBoxClass =
    "relative w-full h-16 sm:h-[4.5rem] mt-1.5 border-2 border-black rounded-sm bg-white overflow-hidden";

  const nameTextClass =
    "truncate max-w-full min-w-0 leading-snug text-sm sm:text-base";

  return (
    <div className="flex flex-col items-center w-28 sm:w-32">
      <div
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black bg-brand-footer shrink-0"
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
            deskBoxClass,
            "focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1",
            canDragFromDesk && "cursor-grab active:cursor-grabbing",
            isDragOver && "ring-2 ring-blue-500 ring-offset-1 border-blue-500",
          )}
        >
          {/* 배지: 이름 세로 중앙선 바로 위 (입력 텍스트 위치와 동일) */}
          {officerInfo ? (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              aria-hidden
            >
              <div className="relative h-0 w-0">{officerBadge}</div>
            </div>
          ) : null}
          <input
            type="text"
            value={studentName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="이름"
            aria-label={`${seatLabel} 학생 이름`}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className={cn(
              "absolute inset-0 w-full h-full border-0 bg-transparent text-center font-semibold pointer-events-auto",
              nameTextClass,
              "text-black placeholder:text-zinc-500 placeholder:font-normal",
              "focus:outline-none",
            )}
            maxLength={20}
          />
        </div>
      ) : (
        <div
          className={cn(deskBoxClass, !trimmedName && "text-zinc-500")}
          title={trimmedName || "빈 좌석"}
        >
          <div className="absolute inset-0 flex items-center justify-center px-1.5">
            <div className="relative max-w-full min-w-0">
              {officerBadge}
              {trimmedName && profileId ? (
                <Link
                  href={`/user/${profileId}`}
                  className={cn(
                    nameTextClass,
                    "block font-semibold text-blue-600 dark:text-blue-400 hover:underline",
                  )}
                >
                  {trimmedName}
                </Link>
              ) : (
                <span
                  className={cn(
                    nameTextClass,
                    "block",
                    trimmedName ? "font-semibold text-black" : "font-medium",
                  )}
                >
                  {trimmedName || "—"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
