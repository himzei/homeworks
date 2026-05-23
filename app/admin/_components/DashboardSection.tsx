import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DashboardSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 보조 설명 */
  description?: string;
  /** 더보기 링크 (선택) */
  moreHref?: string;
  /** 더보기 링크 텍스트 */
  moreLabel?: string;
  /** 우측 액션 영역 */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * 대시보드 섹션 래퍼 - 제목과 더보기 링크를 일관된 스타일로 표시
 */
export default function DashboardSection({
  title,
  description,
  moreHref,
  moreLabel = "전체 보기",
  actions,
  children,
}: DashboardSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-black dark:text-zinc-50">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {moreHref ? (
            <Link
              href={moreHref}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {moreLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
