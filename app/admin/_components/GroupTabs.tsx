"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { GROUP_OPTIONS } from "@/lib/constants";

interface GroupTabsProps {
  /** 현재 선택된 그룹 값 (없으면 "전체") */
  selectedGroup: string | null;
  /** 그룹별 학생 수 집계 (key: group_name, "all" 키는 전체 학생 수) */
  studentCountsByGroup?: Record<string, number>;
}

/**
 * 관리자 대시보드 그룹(기수) 탭 메뉴
 * - 가로 스크롤 가능한 탭 UI
 * - 각 탭에 그룹명(짧은 라벨) + 학생 수 배지 표시
 * - URL의 `group` 쿼리 파라미터를 갱신하여 서버 컴포넌트 재실행 트리거
 */
export default function GroupTabs({
  selectedGroup,
  studentCountsByGroup = {},
}: GroupTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 라우팅 중 UI 응답성 유지를 위해 transition 사용
  const [isPending, startTransition] = useTransition();

  // 빈 옵션 제외한 그룹 목록
  const groupOptions = GROUP_OPTIONS.filter((opt) => opt.value);
  const isAllSelected = !selectedGroup || selectedGroup === "all";

  // 탭 클릭 → URL 업데이트
  const handleSelect = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete("group");
    } else {
      params.set("group", value);
    }
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    startTransition(() => {
      router.replace(newUrl);
    });
  };

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <nav
        role="tablist"
        aria-label="과정 필터"
        className="flex gap-1 overflow-x-auto scrollbar-hide"
      >
        <GroupTabButton
          isActive={isAllSelected}
          isPending={isPending}
          onClick={() => handleSelect(null)}
          label="전체"
          count={studentCountsByGroup.all}
        />
        {groupOptions.map((opt) => (
          <GroupTabButton
            key={opt.value}
            isActive={selectedGroup === opt.value}
            isPending={isPending}
            onClick={() => handleSelect(opt.value)}
            label={extractShortLabel(opt.label)}
            fullLabel={opt.label}
            count={studentCountsByGroup[opt.value]}
          />
        ))}
      </nav>
    </div>
  );
}

interface GroupTabButtonProps {
  /** 현재 활성화된 탭인지 */
  isActive: boolean;
  /** 라우팅 전환 중인지 (모든 탭에 동일하게 적용) */
  isPending: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 짧은 라벨 (예: "15기") */
  label: string;
  /** 풀 라벨 (툴팁 표시용) */
  fullLabel?: string;
  /** 학생 수 (있으면 배지로 표시) */
  count?: number;
}

/** 그룹 탭 버튼 (단일 탭) */
function GroupTabButton({
  isActive,
  isPending,
  onClick,
  label,
  fullLabel,
  count,
}: GroupTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      title={fullLabel ?? label}
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-progress",
        isActive
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 hover:border-zinc-300 dark:hover:border-zinc-700",
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] py-0.5 text-xs tabular-nums",
            isActive
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * 그룹 풀네임에서 짧은 라벨(기수)만 추출
 * 예) "15기 교육생 - 빅데이터 전문가 양성과정" → "15기"
 */
function extractShortLabel(fullLabel: string): string {
  const match = fullLabel.match(/^(\d+기)/);
  return match ? match[1] : fullLabel;
}
