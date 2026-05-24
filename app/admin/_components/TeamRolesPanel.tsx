"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  buildTeamRolesStateFromStudents,
  MAX_TEAM_COUNT,
  type ClassRoleStudent,
  type TeamRolesState,
} from "@/lib/class-officers";
import { extractCourseShortLabel } from "@/lib/courses";

import TeamRolesDragBoard from "./TeamRolesDragBoard";

export type TeamRolesSavePayload = {
  teamLeaders: Record<string, string | null>;
  teamMembers: Record<string, string[] | null>;
  teamCount: number;
};

type TeamRolesPanelProps = {
  groupName: string;
  students: ClassRoleStudent[];
  initialTeamState?: TeamRolesState;
  onSave: (payload: TeamRolesSavePayload) => Promise<{ error?: string }>;
  saveButtonLabel?: string;
  cancelHref?: string;
};

/**
 * 조장·조원 지정 (드래그앤드롭, 게시판 글쓰기용 · 반장은 목록에서 설정)
 */
export default function TeamRolesPanel({
  groupName,
  students,
  initialTeamState,
  onSave,
  saveButtonLabel = "글 저장·적용",
  cancelHref,
}: TeamRolesPanelProps) {
  const initialState = useMemo(
    () => initialTeamState ?? buildTeamRolesStateFromStudents(students),
    [students, initialTeamState],
  );

  const [teamLeaders, setTeamLeaders] = useState<Record<number, string>>(
    initialState.teamLeaders,
  );
  const [teamMembers, setTeamMembers] = useState<Record<number, string[]>>(
    initialState.teamMembers,
  );
  const [teamCount, setTeamCount] = useState(initialState.teamCount);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cohortLabel = extractCourseShortLabel(groupName);

  useEffect(() => {
    if (initialTeamState) return;
    const next = buildTeamRolesStateFromStudents(students);
    setTeamLeaders(next.teamLeaders);
    setTeamMembers(next.teamMembers);
    setTeamCount(next.teamCount);
  }, [students, groupName, initialTeamState]);

  const handleSave = async () => {
    setFormError(null);
    setIsSaving(true);

    try {
      const teamLeadersPayload: Record<string, string | null> = {};
      const teamMembersPayload: Record<string, string[] | null> = {};

      for (let team = 1; team <= teamCount; team++) {
        teamLeadersPayload[String(team)] = teamLeaders[team] ?? null;
        const members = (teamMembers[team] ?? []).filter(
          (id) => id !== teamLeaders[team],
        );
        teamMembersPayload[String(team)] =
          members.length > 0 ? members : null;
      }

      const result = await onSave({
        teamLeaders: teamLeadersPayload,
        teamMembers: teamMembersPayload,
        teamCount,
      });

      if (result.error) {
        setFormError(result.error);
      }
    } catch (error) {
      console.error("조 편성 저장 오류:", error);
      setFormError("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-950">
        <Users className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          이 과정에 등록된 학생이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 sm:p-6">
        <TeamRolesDragBoard
          cohortLabel={cohortLabel}
          courseName={groupName}
          students={students}
          teamLeaders={teamLeaders}
          teamMembers={teamMembers}
          teamCount={teamCount}
          onTeamLeadersChange={setTeamLeaders}
          onTeamMembersChange={setTeamMembers}
          onTeamCountChange={setTeamCount}
          maxTeamCount={MAX_TEAM_COUNT}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        {cancelHref ? (
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>취소</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isSaving ? "저장 중..." : saveButtonLabel}
        </Button>
      </div>
    </div>
  );
}
