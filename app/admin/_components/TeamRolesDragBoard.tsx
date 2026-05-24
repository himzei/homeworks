"use client";

import { useMemo, useState } from "react";
import { Crown, GripVertical, Minus, Plus, Users } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";
import {
  parseTeamRolesDrag,
  serializeTeamRolesDrag,
  TEAM_ROLES_DRAG_MIME,
  type TeamRolesDragPayload,
} from "@/lib/team-roles-drag";
import {
  findClassPresidentId,
  type ClassRoleStudent,
} from "@/lib/class-officers";

type TeamRolesDragBoardProps = {
  /** 기수 라벨 (예: 15기) */
  cohortLabel: string;
  /** 전체 과정명 */
  courseName: string;
  students: ClassRoleStudent[];
  teamLeaders: Record<number, string>;
  teamMembers: Record<number, string[]>;
  teamCount: number;
  onTeamLeadersChange: (next: Record<number, string>) => void;
  onTeamMembersChange: (next: Record<number, string[]>) => void;
  onTeamCountChange: (count: number) => void;
  maxTeamCount: number;
};

function readDragPayload(event: React.DragEvent): TeamRolesDragPayload | null {
  const raw =
    event.dataTransfer.getData(TEAM_ROLES_DRAG_MIME) ||
    event.dataTransfer.getData("text/plain");
  return parseTeamRolesDrag(raw);
}

function startDrag(event: React.DragEvent, payload: TeamRolesDragPayload) {
  const serialized = serializeTeamRolesDrag(payload);
  event.dataTransfer.setData(TEAM_ROLES_DRAG_MIME, serialized);
  event.dataTransfer.setData("text/plain", serialized);
  event.dataTransfer.effectAllowed = "move";
}

type StudentChipProps = {
  studentId: string;
  name: string;
  variant: "roster" | "president" | "leader" | "member";
  onDragStart: (event: React.DragEvent) => void;
  onRemoveFromTeam?: () => void;
};

function StudentChip({
  name,
  variant,
  onDragStart,
  onRemoveFromTeam,
}: StudentChipProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium",
        "cursor-grab active:cursor-grabbing select-none border transition-colors",
        variant === "president" &&
          "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
        variant === "leader" &&
          "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        variant === "member" &&
          "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100",
        variant === "roster" &&
          "border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 opacity-40" aria-hidden />
      {variant === "president" || variant === "leader" ? (
        <Crown
          className={cn(
            "size-3.5 shrink-0",
            variant === "president" ? "text-violet-600" : "text-amber-600",
          )}
          aria-hidden
        />
      ) : null}
      <span className="truncate max-w-[120px]">{name}</span>
      {onRemoveFromTeam ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveFromTeam();
          }}
          className="ml-0.5 rounded px-1 text-xs text-zinc-400 hover:text-red-600"
          aria-label={`${name} 배정 해제`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

type DropZoneProps = {
  label: string;
  hint: string;
  zoneVariant?: "leader" | "default";
  isEmpty: boolean;
  onDrop: (event: React.DragEvent) => void;
  children: React.ReactNode;
};

function DropZone({
  label,
  hint,
  zoneVariant = "default",
  isEmpty,
  onDrop,
  children,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onDrop(event);
      }}
      className={cn(
        "rounded-lg border border-dashed p-3 min-h-[52px] transition-colors",
        zoneVariant === "leader" &&
          "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20",
        zoneVariant === "default" &&
          "border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30",
        isDragOver && "ring-2 ring-blue-500 border-blue-400",
        isEmpty && "flex flex-col justify-center",
      )}
    >
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
        {label}
        <span className="font-normal text-zinc-400 dark:text-zinc-500">
          {" "}
          · {hint}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * 드래그앤드롭 조 편성 보드 (반장은 조에 배치 가능, 반장 지정은 목록에서)
 */
export default function TeamRolesDragBoard({
  cohortLabel,
  courseName,
  students,
  teamLeaders,
  teamMembers,
  teamCount,
  onTeamLeadersChange,
  onTeamMembersChange,
  onTeamCountChange,
  maxTeamCount,
}: TeamRolesDragBoardProps) {
  const [rosterDragOver, setRosterDragOver] = useState(false);

  const classPresidentId = useMemo(
    () => findClassPresidentId(students),
    [students],
  );

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of students) {
      map[student.id] = student.name;
    }
    return map;
  }, [students]);

  const chipVariant = (
    studentId: string,
    slot: "leader" | "member" | "roster",
  ): StudentChipProps["variant"] => {
    if (studentId === classPresidentId) return "president";
    if (slot === "leader") return "leader";
    if (slot === "member") return "member";
    return "roster";
  };

  const clearStudentFromAllTeams = (studentId: string) => {
    const nextLeaders = { ...teamLeaders };
    const nextMembers = { ...teamMembers };
    for (let team = 1; team <= teamCount; team++) {
      if (nextLeaders[team] === studentId) delete nextLeaders[team];
      nextMembers[team] = (nextMembers[team] ?? []).filter(
        (id) => id !== studentId,
      );
    }
    onTeamLeadersChange(nextLeaders);
    onTeamMembersChange(nextMembers);
  };

  const assignAsLeader = (teamNumber: number, studentId: string) => {
    clearStudentFromAllTeams(studentId);
    const nextLeaders = { ...teamLeaders, [teamNumber]: studentId };
    const nextMembers = { ...teamMembers };
    nextMembers[teamNumber] = (nextMembers[teamNumber] ?? []).filter(
      (id) => id !== studentId,
    );
    onTeamLeadersChange(nextLeaders);
    onTeamMembersChange(nextMembers);
  };

  const assignAsMember = (teamNumber: number, studentId: string) => {
    clearStudentFromAllTeams(studentId);
    const nextMembers = { ...teamMembers };
    for (let team = 1; team <= teamCount; team++) {
      nextMembers[team] = (nextMembers[team] ?? []).filter(
        (id) => id !== studentId,
      );
    }
    const members = nextMembers[teamNumber] ?? [];
    nextMembers[teamNumber] = [...members, studentId];
    onTeamLeadersChange({ ...teamLeaders });
    onTeamMembersChange(nextMembers);
  };

  const resolveStudentIdFromPayload = (
    payload: TeamRolesDragPayload,
  ): string | null => {
    return payload.studentId;
  };

  const handleDropOnLeader = (teamNumber: number, event: React.DragEvent) => {
    const payload = readDragPayload(event);
    if (!payload) return;
    const studentId = resolveStudentIdFromPayload(payload);
    if (!studentId) return;
    assignAsLeader(teamNumber, studentId);
  };

  const handleDropOnMembers = (teamNumber: number, event: React.DragEvent) => {
    const payload = readDragPayload(event);
    if (!payload) return;
    const studentId = resolveStudentIdFromPayload(payload);
    if (!studentId) return;
    assignAsMember(teamNumber, studentId);
  };

  const handleDropOnRoster = (event: React.DragEvent) => {
    const payload = readDragPayload(event);
    if (!payload) return;
    if (payload.type === "team-member" || payload.type === "team-leader") {
      clearStudentFromAllTeams(payload.studentId);
    }
  };

  const handleAddTeam = () => {
    if (teamCount >= maxTeamCount) return;
    onTeamCountChange(teamCount + 1);
  };

  const handleRemoveTeam = () => {
    if (teamCount <= 1) return;
    const nextLeaders = { ...teamLeaders };
    const nextMembers = { ...teamMembers };
    delete nextLeaders[teamCount];
    delete nextMembers[teamCount];
    onTeamLeadersChange(nextLeaders);
    onTeamMembersChange(nextMembers);
    onTeamCountChange(teamCount - 1);
  };

  const unassignedIds = students
    .map((s) => s.id)
    .filter((id) => {
      for (let team = 1; team <= teamCount; team++) {
        if (teamLeaders[team] === id) return false;
        if ((teamMembers[team] ?? []).includes(id)) return false;
      }
      return true;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              {cohortLabel}
            </span>
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              조 편성
            </h2>
          </div>
          {courseName !== cohortLabel ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {courseName}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            명단에서 학생을 끌어 각 조에 놓으세요. 조장 칸에 놓으면 조장이
            됩니다. 반장도 조에 배치할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveTeam}
            disabled={teamCount <= 1}
          >
            <Minus className="size-4" />
            조 줄이기
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTeam}
            disabled={teamCount >= maxTeamCount}
          >
            <Plus className="size-4" />
            조 추가
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        {/* 미배정 명단 */}
        <aside
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setRosterDragOver(true);
          }}
          onDragLeave={() => setRosterDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setRosterDragOver(false);
            handleDropOnRoster(event);
          }}
          className={cn(
            "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 h-fit lg:sticky lg:top-24",
            rosterDragOver && "ring-2 ring-blue-500 border-blue-400",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="size-4 text-zinc-500" aria-hidden />
            <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
              {cohortLabel} 명단
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {unassignedIds.length}명 미배정 · 드래그하여 조에 배치
          </p>
          {unassignedIds.length === 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 py-6 text-center">
              모든 학생이 조에 배치되었습니다.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2 max-h-[min(60vh,480px)] overflow-y-auto">
              {unassignedIds.map((studentId) => (
                <li key={studentId}>
                  <StudentChip
                    studentId={studentId}
                    name={nameById[studentId] ?? "—"}
                    variant={chipVariant(studentId, "roster")}
                    onDragStart={(event) =>
                      startDrag(event, { type: "student", studentId })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 조 열 */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: teamCount }, (_, index) => {
            const teamNumber = index + 1;
            const leaderId = teamLeaders[teamNumber];
            const members = (teamMembers[teamNumber] ?? []).filter(
              (id) => id !== leaderId,
            );

            return (
              <article
                key={teamNumber}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-3"
              >
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {cohortLabel} {teamNumber}조
                </h3>

                <DropZone
                  label="조장"
                  hint="끌어다 놓기"
                  zoneVariant="leader"
                  isEmpty={!leaderId}
                  onDrop={(event) => handleDropOnLeader(teamNumber, event)}
                >
                  {leaderId ? (
                    <StudentChip
                      studentId={leaderId}
                      name={nameById[leaderId] ?? "—"}
                      variant={chipVariant(leaderId, "leader")}
                      onDragStart={(event) =>
                        startDrag(event, {
                          type: "team-leader",
                          studentId: leaderId,
                          teamNumber,
                        })
                      }
                      onRemoveFromTeam={() =>
                        clearStudentFromAllTeams(leaderId)
                      }
                    />
                  ) : (
                    <span className="text-xs text-zinc-400">비어 있음</span>
                  )}
                </DropZone>

                <DropZone
                  label="조원"
                  hint="끌어다 놓기"
                  isEmpty={members.length === 0}
                  onDrop={(event) => handleDropOnMembers(teamNumber, event)}
                >
                  {members.length === 0 ? (
                    <span className="text-xs text-zinc-400">비어 있음</span>
                  ) : (
                    members.map((memberId) => (
                      <StudentChip
                        key={memberId}
                        studentId={memberId}
                        name={nameById[memberId] ?? "—"}
                        variant={chipVariant(memberId, "member")}
                        onDragStart={(event) =>
                          startDrag(event, {
                            type: "team-member",
                            studentId: memberId,
                            teamNumber,
                          })
                        }
                        onRemoveFromTeam={() =>
                          clearStudentFromAllTeams(memberId)
                        }
                      />
                    ))
                  )}
                </DropZone>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
