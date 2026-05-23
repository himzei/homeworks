import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** 카드 제목 (예: "전체 학생") */
  label: string;
  /** 메인 수치 (큰 글자) */
  value: number | string;
  /** 보조 설명 텍스트 (예: "이번 주 +3명") */
  hint?: string;
  /** 좌측에 표시할 아이콘 */
  icon: ReactNode;
  /** 아이콘 배경 / 액센트 색상 */
  accentClassName?: string;
  /** 강조 표시 여부 (검토 대기 같은 액션 필요 항목) */
  highlight?: boolean;
}

/**
 * 관리자 대시보드 KPI 카드
 * - 한눈에 핵심 지표를 파악할 수 있도록 큰 숫자와 아이콘을 표시
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  accentClassName,
  highlight = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md",
        highlight
          ? "border-amber-300 dark:border-amber-700/60"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50 tabular-nums">
            {value}
          </p>
          {hint ? (
            <p
              className={cn(
                "mt-1 text-xs",
                highlight
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg shrink-0",
            accentClassName ??
              "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
