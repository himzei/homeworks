"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  /** 한글 주석: 섹션 제목(헤더) 텍스트 */
  title: string;
  /** 한글 주석: 기본 펼침 여부(기본값: false = 접힘) */
  defaultExpanded?: boolean;
  /** 한글 주석: 헤더 오른쪽에 붙일 액션(예: 글쓰기 버튼) */
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * 한글 주석: 섹션 단위 접기/펼치기 래퍼
 * - 제목 영역(헤더)에서 토글
 * - 기본 접힘/펼침 설정 가능
 */
export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  headerActions,
  children,
  className,
}: CollapsibleSectionProps) {
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerActions ? <div className="shrink-0">{headerActions}</div> : null}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            aria-label={isExpanded ? `${title} 접기` : `${title} 펴기`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-3.5 shrink-0" aria-hidden />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                펴기
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded ? <div id={contentId}>{children}</div> : null}
    </section>
  );
}

