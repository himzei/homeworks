"use client";

import { useMemo, useState } from "react";
import { GripVertical, Medal, Plus } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";
import {
  HONOR_BADGES_DRAG_MIME,
  parseHonorBadgesDrag,
  serializeHonorBadgesDrag,
  type HonorBadgesDragPayload,
} from "@/lib/honor-badges-drag";
import type { ClassRoleStudent } from "@/lib/class-officers";

/** 편집 중 배지 상태 */
export type HonorBadgeDraft = {
  id: string;
  label: string;
  profileIds: string[];
};

type HonorBadgesDragBoardProps = {
  students: ClassRoleStudent[];
  badges: HonorBadgeDraft[];
  onBadgesChange: (next: HonorBadgeDraft[]) => void;
};

function readDragPayload(event: React.DragEvent): HonorBadgesDragPayload | null {
  const raw =
    event.dataTransfer.getData(HONOR_BADGES_DRAG_MIME) ||
    event.dataTransfer.getData("text/plain");
  return parseHonorBadgesDrag(raw);
}

function startDrag(event: React.DragEvent, payload: HonorBadgesDragPayload) {
  const serialized = serializeHonorBadgesDrag(payload);
  event.dataTransfer.setData(HONOR_BADGES_DRAG_MIME, serialized);
  event.dataTransfer.setData("text/plain", serialized);
  event.dataTransfer.effectAllowed = "copy";
}

type StudentChipProps = {
  name: string;
  onDragStart: (event: React.DragEvent) => void;
  onRemove: () => void;
};

function AssignedStudentChip({ name, onDragStart, onRemove }: StudentChipProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium",
        "cursor-grab active:cursor-grabbing select-none border transition-colors",
        "border-emerald-200 bg-emerald-50 text-emerald-900",
        "dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 opacity-40" aria-hidden />
      <span className="truncate max-w-[120px]">{name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 rounded px-1 text-xs text-zinc-400 hover:text-red-600"
        aria-label={`${name} 배지에서 제거`}
      >
        ×
      </button>
    </div>
  );
}

type BadgeDropZoneProps = {
  badge: HonorBadgeDraft;
  nameById: Record<string, string>;
  onDrop: (event: React.DragEvent) => void;
  onRemoveStudent: (studentId: string) => void;
  onLabelChange: (label: string) => void;
  onRemoveBadge: () => void;
};

function BadgeDropZone({
  badge,
  nameById,
  onDrop,
  onRemoveStudent,
  onLabelChange,
  onRemoveBadge,
}: BadgeDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <article
      className={cn(
        "rounded-xl border border-emerald-200 dark:border-emerald-900/60",
        "bg-white dark:bg-zinc-950 p-3 space-y-3 min-h-[120px]",
        isDragOver && "ring-2 ring-emerald-500",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onDrop(event);
      }}
    >
      <div className="flex items-start gap-2">
        <Medal
          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-2"
          aria-hidden
        />
        <input
          type="text"
          value={badge.label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="배지 이름 (예: 5월우수)"
          className={cn(
            "flex-1 min-w-0 rounded-lg border border-zinc-300 dark:border-zinc-700",
            "bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm font-semibold",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500",
          )}
          maxLength={30}
        />
        <button
          type="button"
          onClick={onRemoveBadge}
          className="shrink-0 rounded px-2 py-1 text-xs text-zinc-400 hover:text-red-600"
          aria-label="배지 삭제"
        >
          삭제
        </button>
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        명단에서 끌어다 놓기 · {badge.profileIds.length}명
      </p>

      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {badge.profileIds.length === 0 ? (
          <span className="text-xs text-zinc-400 py-1">비어 있음</span>
        ) : (
          badge.profileIds.map((studentId) => (
            <AssignedStudentChip
              key={studentId}
              name={nameById[studentId] ?? "—"}
              onDragStart={(event) =>
                startDrag(event, {
                  type: "badge-member",
                  studentId,
                  badgeId: badge.id,
                })
              }
              onRemove={() => onRemoveStudent(studentId)}
            />
          ))
        )}
      </div>
    </article>
  );
}

/**
 * 섹션 내 배지 목록 — 명단은 상위 HonorStudentRoster 사용
 */
export default function HonorBadgesDragBoard({
  students,
  badges,
  onBadgesChange,
}: HonorBadgesDragBoardProps) {
  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of students) {
      map[student.id] = student.name;
    }
    return map;
  }, [students]);

  /** 해당 배지에만 추가 (다른 배지·명단에는 영향 없음, 중복 배지 허용) */
  const assignStudentToBadge = (badgeId: string, studentId: string) => {
    onBadgesChange(
      badges.map((badge) => {
        if (badge.id !== badgeId) return badge;
        if (badge.profileIds.includes(studentId)) return badge;
        return {
          ...badge,
          profileIds: [...badge.profileIds, studentId],
        };
      }),
    );
  };

  const handleDropOnBadge = (badgeId: string, event: React.DragEvent) => {
    const payload = readDragPayload(event);
    if (!payload) return;
    assignStudentToBadge(badgeId, payload.studentId);
  };

  const handleAddBadge = () => {
    const month = new Date().getMonth() + 1;
    onBadgesChange([
      ...badges,
      {
        id: `new-${crypto.randomUUID()}`,
        label: `${month}월우수`,
        profileIds: [],
      },
    ]);
  };

  const updateBadge = (badgeId: string, patch: Partial<HonorBadgeDraft>) => {
    onBadgesChange(
      badges.map((b) => (b.id === badgeId ? { ...b, ...patch } : b)),
    );
  };

  const removeBadge = (badgeId: string) => {
    onBadgesChange(badges.filter((b) => b.id !== badgeId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          「배지 추가」로 배지를 만든 뒤, 위 명단에서 학생을 끌어 각 배지에
          놓으세요.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBadge}
          className="shrink-0"
        >
          <Plus className="size-4" />
          배지 추가
        </Button>
      </div>

      {badges.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center">
          「배지 추가」로 &quot;5월우수&quot; 같은 배지를 만든 뒤, 위 명단에서
          학생을 끌어 배정하세요.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <BadgeDropZone
              key={badge.id}
              badge={badge}
              nameById={nameById}
              onDrop={(event) => handleDropOnBadge(badge.id, event)}
              onRemoveStudent={(studentId) =>
                updateBadge(badge.id, {
                  profileIds: badge.profileIds.filter((id) => id !== studentId),
                })
              }
              onLabelChange={(label) => updateBadge(badge.id, { label })}
              onRemoveBadge={() => removeBadge(badge.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
