"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import { cn } from "@/lib/utils";
import {
  MEMBERS_UNSET_GROUP,
  buildMembersListQueryString,
} from "@/lib/admin/members-list-query";
import {
  sortGroupOptionsByCohortDesc,
  type GroupOption,
} from "@/lib/fetch-group-options";

type AdminMembersFiltersProps = {
  selectedGroup: string | null;
  searchQuery: string;
  groupOptions: GroupOption[];
  memberCountsByGroup: Record<string, number>;
};

function extractShortLabel(label: string): string {
  const match = label.match(/(\d+기)/);
  return match ? match[1] : label;
}

/**
 * 회원 관리 — 기수 필터 탭 + 이름·연락처 검색
 */
export default function AdminMembersFilters({
  selectedGroup,
  searchQuery,
  groupOptions,
  memberCountsByGroup,
}: AdminMembersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const courseOptions = sortGroupOptionsByCohortDesc(
    groupOptions.filter((opt) => opt.value),
  );

  const navigate = (next: { group?: string | null; q?: string }) => {
    const query = buildMembersListQueryString({
      group: next.group ?? selectedGroup,
      q: next.q ?? searchQuery,
      page: 1,
    });
    startTransition(() => {
      // scroll: false — 필터 변경 시 스크롤을 맨 위로 올리지 않고 현재 위치 유지
      router.replace(`${pathname}${query}`, { scroll: false });
    });
  };

  const handleGroupSelect = (group: string | null) => {
    navigate({ group });
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ q: localSearch.trim() });
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    navigate({ q: "" });
  };

  const isAllSelected = !selectedGroup;
  const isUnsetSelected = selectedGroup === MEMBERS_UNSET_GROUP;

  return (
    <div className="mb-6 space-y-4">
      {/* 검색 */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="이름 또는 연락처로 검색"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-black outline-none ring-blue-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            disabled={isPending}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "검색"
            )}
          </Button>
          {searchQuery ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleClearSearch}
            >
              <X className="size-4" />
              초기화
            </Button>
          ) : null}
        </div>
      </form>

      {/* 기수 필터 */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav
          role="tablist"
          aria-label="기수 필터"
          className="flex gap-1 overflow-x-auto scrollbar-hide pb-px"
        >
          <FilterTab
            isActive={isAllSelected}
            isPending={isPending}
            label="전체"
            count={memberCountsByGroup.all}
            onClick={() => handleGroupSelect(null)}
          />
          {courseOptions.map((opt) => (
            <FilterTab
              key={opt.value}
              isActive={selectedGroup === opt.value}
              isPending={isPending}
              label={extractShortLabel(opt.label)}
              fullLabel={opt.label}
              count={memberCountsByGroup[opt.value]}
              onClick={() => handleGroupSelect(opt.value)}
            />
          ))}
          <FilterTab
            isActive={isUnsetSelected}
            isPending={isPending}
            label="미분류"
            count={memberCountsByGroup[MEMBERS_UNSET_GROUP]}
            onClick={() => handleGroupSelect(MEMBERS_UNSET_GROUP)}
          />
        </nav>
      </div>

      {searchQuery ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          검색어: <span className="font-medium text-zinc-700 dark:text-zinc-300">{searchQuery}</span>
        </p>
      ) : null}
    </div>
  );
}

function FilterTab({
  isActive,
  isPending,
  onClick,
  label,
  fullLabel,
  count,
}: {
  isActive: boolean;
  isPending: boolean;
  onClick: () => void;
  label: string;
  fullLabel?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      title={fullLabel ?? label}
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "border-blue-500 text-blue-600 dark:text-blue-400"
          : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-black dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-50",
        isPending && "opacity-60",
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
            isActive
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
