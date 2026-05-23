import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";

export interface PendingConsultationItem {
  /** consultations 테이블 ID */
  id: string;
  /** 학생 이름 */
  studentName: string;
  /** 학생 user ID */
  studentId: string;
  /** 상담 내용 미리보기 */
  content: string;
  /** 작성 시각 (UTC ISO 문자열) */
  createdAt: string;
}

interface PendingConsultationListProps {
  items: PendingConsultationItem[];
}

/**
 * 답변 대기(status='대기중') 상담 리스트
 */
export default function PendingConsultationList({
  items,
}: PendingConsultationListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card p-8 text-center">
        <MessageCircleQuestion className="mx-auto size-8 text-emerald-500 dark:text-emerald-400 mb-2" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          답변 대기 중인 상담이 없습니다.
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
                  <span className="inline-flex items-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs px-2 py-0.5">
                    대기중
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                  {item.content}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatKoreaDateTimeFromUtc(item.createdAt)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <Link
          href="/home?tab=consultation"
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          상담 전체 보기 →
        </Link>
      </div>
    </div>
  );
}
