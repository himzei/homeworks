"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, PencilLine, Trash2, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { SeatingChartListItem } from "@/lib/seating";
import { Button } from "@/app/_components/ui/button";

/** 작성일 표시용 포매터 */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type SeatingChartListProps = {
  charts: SeatingChartListItem[];
  newChartHref: string;
  /** group 쿼리 유지용 */
  groupQuery: string;
};

/**
 * 자리배치도 게시판 목록
 */
export default function SeatingChartList({
  charts,
  newChartHref,
  groupQuery,
}: SeatingChartListProps) {
  const router = useRouter();

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" 자리배치도를 삭제할까요?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("seating_charts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("자리배치도 삭제 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
      return;
    }

    router.refresh();
  };

  if (charts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-white dark:bg-zinc-950">
        <LayoutGrid className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          아직 등록된 자리배치도가 없습니다.
        </p>
        <Button asChild className="mt-4">
          <Link href={newChartHref}>
            <PencilLine className="size-4" />
            첫 자리배치도 작성
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {charts.map((chart) => (
        <li
          key={chart.id}
          className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
        >
          <Link
            href={`/admin/seating/${chart.id}${groupQuery}`}
            className="flex-1 min-w-0 flex flex-col gap-1"
          >
            <span className="text-sm sm:text-base font-medium text-black dark:text-zinc-50 truncate">
              {chart.title}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <LayoutGrid className="size-3.5" aria-hidden />
                {chart.rowCount}×{chart.colCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {chart.assignedCount}/{chart.totalSeats}명
              </span>
              {chart.groupName ? (
                <span className="truncate max-w-[200px]">{chart.groupName}</span>
              ) : (
                <span>전체 공통</span>
              )}
              <span>{dateFormatter.format(new Date(chart.createdAt))}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/admin/seating/${chart.id}/edit${groupQuery}`}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              aria-label={`${chart.title} 수정`}
            >
              <PencilLine className="size-3.5" aria-hidden />
              수정
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(chart.id, chart.title)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              aria-label={`${chart.title} 삭제`}
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
