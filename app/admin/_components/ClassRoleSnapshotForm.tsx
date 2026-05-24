"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import {
  buildClassRoleDefaultTitle,
  type ClassRoleSnapshotDetail,
} from "@/lib/class-role-snapshots";
import {
  buildEmptyTeamRolesState,
  type ClassRoleStudent,
} from "@/lib/class-officers";
import type { CourseScheduleForTitle } from "@/lib/seating-chart-title";

import TeamRolesPanel, {
  type TeamRolesSavePayload,
} from "./TeamRolesPanel";

type ClassRoleSnapshotFormProps = {
  groupName: string;
  students: ClassRoleStudent[];
  listHref: string;
  courseSchedulesByGroupName?: Record<string, CourseScheduleForTitle>;
  initialSuggestedTitle?: string;
  initialData?: ClassRoleSnapshotDetail;
};

/**
 * 조 편성 게시판 글 작성·수정 (조장·조원)
 */
export default function ClassRoleSnapshotForm({
  groupName,
  students,
  listHref,
  courseSchedulesByGroupName = {},
  initialSuggestedTitle = "",
  initialData,
}: ClassRoleSnapshotFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const titleManuallyEditedRef = useRef(!!initialData?.title);

  const [title, setTitle] = useState(
    initialData?.title ?? initialSuggestedTitle,
  );

  const initialTeamState = useMemo(() => {
    if (initialData) {
      return {
        teamLeaders: initialData.teamLeaders,
        teamMembers: initialData.teamMembers,
        teamCount: initialData.teamCount,
        classPresidentId: initialData.classPresidentId,
      };
    }
    return buildEmptyTeamRolesState(students);
  }, [initialData, students]);

  const handleTitleChange = (nextTitle: string) => {
    titleManuallyEditedRef.current = true;
    setTitle(nextTitle);
  };

  const handleGroupTitleSuggest = () => {
    if (titleManuallyEditedRef.current && title.trim()) return;
    const suggested = buildClassRoleDefaultTitle(
      groupName,
      courseSchedulesByGroupName[groupName],
    );
    setTitle(suggested);
  };

  const handleSave = async (payload: TeamRolesSavePayload) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return { error: "제목을 입력해 주세요." };
    }

    const body = {
      title: trimmedTitle,
      groupName,
      teamLeaders: payload.teamLeaders,
      teamMembers: payload.teamMembers,
      teamCount: payload.teamCount,
      applyToProfiles: true,
    };

    const url = isEditMode
      ? `/api/admin/class-role-snapshots/${initialData.id}`
      : "/api/admin/class-role-snapshots";
    const method = isEditMode ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      return { error: result.error ?? "저장에 실패했습니다." };
    }

    const groupQuery = `?group=${encodeURIComponent(groupName)}`;
    const targetId = isEditMode ? initialData.id : result.id;
    if (!targetId) {
      router.push(`/admin/class-roles${groupQuery}`);
      return {};
    }
    router.push(`/admin/class-roles/${targetId}${groupQuery}`);
    router.refresh();
    return {};
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            제목
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onFocus={() => {
              if (!title.trim()) handleGroupTitleSuggest();
            }}
            placeholder="예: 3기 5주차 조 편성"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={120}
          />
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          조 편성이 바뀔 때마다 새 글로 남겨 두세요. 반장은 목록에서
          설정하며, 저장 시 학생 프로필·진행과정에 반영됩니다.
        </p>
      </div>

      <TeamRolesPanel
        groupName={groupName}
        students={students}
        initialTeamState={initialTeamState}
        onSave={handleSave}
        saveButtonLabel={isEditMode ? "글 수정·적용" : "글 저장·적용"}
        cancelHref={listHref}
      />
    </div>
  );
}
