"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { GROUP_OPTIONS } from "@/lib/constants";
import type { GroupOption } from "@/lib/fetch-group-options";
import { cn } from "@/lib/utils";

/** "전체"를 나타내는 값 (URL에 표시하지 않음) */
export const GROUP_ALL = "all";

interface GroupSelectorProps {
  /** 현재 선택된 그룹 (서버에서 전달) */
  selectedGroup: string | null;
  /** 서버에서 조회한 과정 옵션 */
  groupOptions?: GroupOption[];
  /** 래퍼 추가 클래스 (여백·정렬 조정) */
  className?: string;
  /** select 추가 클래스 (높이·너비 등) */
  selectClassName?: string;
}

/**
 * 관리자용 과정 선택기 - 선택 시 URL searchParams 갱신하여 서버 컴포넌트 재실행
 */
export default function GroupSelector({
  selectedGroup,
  groupOptions,
  className,
  selectClassName,
}: GroupSelectorProps) {
  const resolvedGroupOptions =
    groupOptions?.filter((opt) => opt.value) ??
    GROUP_OPTIONS.filter((opt) => opt.value);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (value === GROUP_ALL || !value) {
      params.delete("group");
    } else {
      params.set("group", value);
    }

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl);
  };

  // 전체: null 또는 "all"일 때
  const displayValue =
    !selectedGroup || selectedGroup === GROUP_ALL ? GROUP_ALL : selectedGroup;

  return (
    <div
      className={cn(
        "flex items-center mb-4 sm:mb-6",
        className,
      )}
    >
      <select
        id="admin-group-select"
        value={displayValue}
        onChange={handleChange}
        aria-label="과정 선택"
        className={cn(
          "px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          selectClassName,
        )}
      >
        <option value={GROUP_ALL}>전체</option>
        {resolvedGroupOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
