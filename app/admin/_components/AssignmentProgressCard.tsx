import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";

export interface AssignmentProgressItem {
  /** 과제 ID */
  id: string;
  /** 과제 제목 */
  title: string;
  /** 게시 종료 시각 (UTC ISO 문자열) */
  endDate: string;
  /** 제출한 학생 수 */
  submittedCount: number;
  /** 제출 대상 학생 수 (해당 과정 학생 수) */
  totalStudents: number;
}

interface AssignmentProgressCardProps {
  items: AssignmentProgressItem[];
}

/**
 * 진행중 과제 카드 - 각 과제의 제출률을 progress bar로 한눈에 표시
 */
export default function AssignmentProgressCard({
  items,
}: AssignmentProgressCardProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          현재 진행 중인 과제가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card overflow-hidden">
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((item) => {
          // 제출률 계산: 대상 학생이 0명이면 0%로 처리
          const submissionRate =
            item.totalStudents > 0
              ? Math.round((item.submittedCount / item.totalStudents) * 100)
              : 0;

          // 제출률에 따른 색상 결정
          const progressColor =
            submissionRate >= 80
              ? "bg-emerald-500"
              : submissionRate >= 50
                ? "bg-blue-500"
                : submissionRate >= 20
                  ? "bg-amber-500"
                  : "bg-rose-500";

          return (
            <li key={item.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/assignment/edit/${item.id}`}
                    className="text-sm sm:text-base font-semibold text-black dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      마감 {formatKoreaDateTimeFromUtc(item.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {item.submittedCount} / {item.totalStudents}명 제출
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-black dark:text-zinc-50 tabular-nums shrink-0">
                  {submissionRate}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                role="progressbar"
                aria-valuenow={submissionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.title} 제출률`}
              >
                <div
                  className={`h-full ${progressColor} transition-[width] duration-500`}
                  style={{ width: `${submissionRate}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
