"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  ListOrdered,
  PencilLine,
  Trash2,
  Users,
} from "lucide-react";

import { extractCourseShortLabel } from "@/lib/courses";
import type { TrainingCourseListItem } from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

/** 작성일 표시용 포매터 */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type CourseListProps = {
  courses: TrainingCourseListItem[];
  newCourseHref: string;
};

/**
 * 과정 관리 게시판 목록
 */
export default function CourseList({ courses, newCourseHref }: CourseListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, courseName: string) => {
    if (
      !window.confirm(
        `"${courseName}" 과정을 삭제할까요?\n이미 등록된 학생·과제 데이터는 유지됩니다.`,
      )
    ) {
      return;
    }

    const response = await fetch(`/api/admin/training-courses?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      console.error("과정 삭제 오류:", result.error);
      alert(result.error ?? "삭제 중 오류가 발생했습니다.");
      return;
    }

    router.refresh();
  };

  const writeButton = (
    <Button
      asChild
      className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
    >
      <Link href={newCourseHref}>
        <PencilLine className="size-4" />
        글쓰기
      </Link>
    </Button>
  );

  if (courses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{writeButton}</div>
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-950">
          <BookOpen className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            아직 등록된 과정이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{writeButton}</div>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {courses.map((course) => (
        <li
          key={course.id}
          className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
        >
          <Link
            href={`/admin/courses/${course.id}`}
            className="flex-1 min-w-0 flex flex-col gap-1.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {extractCourseShortLabel(course.name)}
              </span>
              {course.isLegacy ? (
                <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  레거시
                </span>
              ) : null}
              {!course.isActive ? (
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  비활성
                </span>
              ) : null}
            </div>
            <span className="text-sm sm:text-base font-medium text-black dark:text-zinc-50">
              {course.name}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {course.preEducationPeriod ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3.5" aria-hidden />
                  사전 {course.preEducationPeriod}
                </span>
              ) : null}
              {course.mainEducationPeriod ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3.5" aria-hidden />
                  본교육 {course.mainEducationPeriod}
                </span>
              ) : null}
              {course.curriculumItemCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <ListOrdered className="size-3.5" aria-hidden />
                  커리큘럼 {course.curriculumItemCount}항목
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                학생 {course.studentCount}명
              </span>
              <span>{dateFormatter.format(new Date(course.createdAt))}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/admin/courses/${course.id}/edit`}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              <PencilLine className="size-3.5" aria-hidden />
              수정
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(course.id, course.name)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label={`${course.name} 삭제`}
            >
              <Trash2 className="size-3.5" aria-hidden />
              삭제
            </button>
          </div>
        </li>
      ))}
      </ul>
    </div>
  );
}
