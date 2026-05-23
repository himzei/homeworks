import Link from "next/link";
import { ExternalLink, FileCheck } from "lucide-react";
import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";

export interface PendingHomeworkItem {
  /** homeworks 테이블 ID */
  id: string;
  /** 제출 학생 이름 */
  studentName: string;
  /** 학생 user ID (프로필 이동용) */
  studentId: string;
  /** 과제 제목 */
  assignmentTitle: string;
  /** 제출 URL */
  submissionUrl: string;
  /** 제출 시각 (UTC ISO 문자열) */
  submittedAt: string;
}

interface PendingHomeworkListProps {
  items: PendingHomeworkItem[];
  /** 비어있을 때 보여줄 메시지 */
  emptyMessage?: string;
}

/**
 * 검토 대기(status='검토중') 제출물 리스트
 * - 평가가 필요한 항목을 빠르게 확인하기 위함
 */
export default function PendingHomeworkList({
  items,
  emptyMessage = "검토 대기 중인 제출물이 없습니다.",
}: PendingHomeworkListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-8 text-center">
        <FileCheck className="mx-auto size-8 text-emerald-500 dark:text-emerald-400 mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card overflow-hidden">
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {items.map((item) => (
          <li
            key={item.id}
            className="p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/user/${item.studentId}`}
                    className="text-sm font-semibold text-black dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {item.studentName}
                  </Link>
                  <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5">
                    검토중
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1">
                  {item.assignmentTitle}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatKoreaDateTimeFromUtc(item.submittedAt)}
                </p>
              </div>
              <a
                href={item.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                제출물 보기
                <ExternalLink className="size-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
