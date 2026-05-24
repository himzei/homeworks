"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, PencilLine, Trash2, Users } from "lucide-react";

import type { ClassRoleSnapshotListItem } from "@/lib/class-role-snapshots";
import { extractCourseShortLabel } from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

/** 작성일 표시용 */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type ClassRoleSnapshotListProps = {
  snapshots: ClassRoleSnapshotListItem[];
  newSnapshotHref: string;
  groupQuery: string;
};

/**
 * 반·조 관리 게시판 목록
 */
export default function ClassRoleSnapshotList({
  snapshots,
  newSnapshotHref,
  groupQuery,
}: ClassRoleSnapshotListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" 글을 삭제할까요?`)) return;

    const response = await fetch(`/api/admin/class-role-snapshots/${id}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      console.error("반·조 글 삭제 오류:", result.error);
      alert(result.error ?? "삭제 중 오류가 발생했습니다.");
      return;
    }

    router.refresh();
  };

  const handleApply = async (id: string, title: string) => {
    if (
      !window.confirm(
        `"${title}" 조 편성을 현재 적용 상태로 바꿀까요?\n반장은 유지되고 조장·조원만 반영됩니다.`,
      )
    ) {
      return;
    }

    const response = await fetch(
      `/api/admin/class-role-snapshots/${id}/apply`,
      { method: "POST" },
    );
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      alert(result.error ?? "적용에 실패했습니다.");
      return;
    }

    router.refresh();
  };

  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-950">
        <Users className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          아직 등록된 반·조 글이 없습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href={newSnapshotHref}>
            <PencilLine className="size-4" />
            첫 반·조 글 작성
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {snapshots.map((snapshot) => (
        <li
          key={snapshot.id}
          className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
        >
          <Link
            href={`/admin/class-roles/${snapshot.id}${groupQuery}`}
            className="flex-1 min-w-0 flex flex-col gap-1"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-medium text-black dark:text-zinc-50 truncate">
                {snapshot.title}
              </span>
              {snapshot.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  현재 적용
                </span>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{extractCourseShortLabel(snapshot.groupName)}</span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                조장 {snapshot.teamLeaderCount}명 · 조원 {snapshot.teamMemberCount}명
              </span>
              <span>{snapshot.teamCount}개 조</span>
              <span>{dateFormatter.format(new Date(snapshot.createdAt))}</span>
            </span>
          </Link>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {!snapshot.isActive ? (
              <button
                type="button"
                onClick={() => handleApply(snapshot.id, snapshot.title)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
              >
                적용
              </button>
            ) : null}
            <Link
              href={`/admin/class-roles/${snapshot.id}/edit${groupQuery}`}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              aria-label={`${snapshot.title} 수정`}
            >
              <PencilLine className="size-3.5" aria-hidden />
              수정
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(snapshot.id, snapshot.title)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label={`${snapshot.title} 삭제`}
            >
              <Trash2 className="size-3.5" aria-hidden />
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
