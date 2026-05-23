"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  ListChecks,
  CheckCircle2,
  ClipboardCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** 관리자 패널 내 페이지 정의 */
const ADMIN_NAV_ITEMS = [
  {
    href: "/admin",
    label: "대시보드",
    icon: LayoutDashboard,
    // 정확히 /admin일 때만 active로 판단
    exact: true,
  },
  {
    href: "/admin/assignments",
    label: "숙제 리스트",
    icon: ListChecks,
    exact: false,
  },
  {
    href: "/admin/evaluation",
    label: "평가",
    icon: CheckCircle2,
    exact: false,
  },
  {
    href: "/admin/surveys",
    label: "설문조사",
    icon: ClipboardCheck,
    exact: false,
  },
  {
    href: "/admin/consultations",
    label: "학생 상담",
    icon: MessageSquare,
    exact: false,
  },
  {
    href: "/admin/progress",
    label: "진행과정",
    icon: Users,
    exact: false,
  },
] as const;

/**
 * 관리자 패널 내 페이지 전환용 sub-navigation
 * - 현재 group 쿼리 파라미터를 유지한 채 페이지만 전환
 * - 클라이언트 라우팅으로 빠른 전환 (Link prefetch 활용)
 */
export default function AdminSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // group 등 기존 쿼리 파라미터를 보존해서 페이지간 이동에도 필터 유지
  const preservedQuery = (() => {
    const params = new URLSearchParams(searchParams.toString());
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  })();

  return (
    <nav
      aria-label="관리자 페이지 내비게이션"
      className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-zinc-200 dark:border-zinc-800 mb-4 sm:mb-6"
    >
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={`${item.href}${preservedQuery}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 hover:border-zinc-300 dark:hover:border-zinc-700",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
