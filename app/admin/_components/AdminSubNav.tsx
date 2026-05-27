"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** 관리자 패널 내 페이지 정의 */
const ADMIN_NAV_ITEMS = [
  {
    href: "/admin",
    label: "대시보드",
    // 정확히 /admin일 때만 active로 판단
    exact: true,
  },
  {
    href: "/admin/assignments",
    label: "숙제 리스트",
    exact: false,
  },
  {
    href: "/admin/evaluation",
    label: "평가",
    exact: false,
  },
  {
    href: "/admin/surveys",
    label: "설문조사",
    exact: false,
  },
  {
    href: "/admin/consultations",
    label: "학생 상담",
    exact: false,
  },
  {
    href: "/admin/company-inquiries",
    label: "기업(문의)",
    exact: false,
  },
  {
    href: "/admin/members",
    label: "회원 관리",
    exact: false,
  },
  {
    href: "/admin/progress",
    label: "진행과정",
    exact: false,
  },
  {
    href: "/admin/class-roles",
    label: "반·조 관리",
    exact: false,
  },
  {
    href: "/admin/seating",
    label: "자리배치도",
    exact: false,
  },
  {
    href: "/admin/courses",
    label: "과정 관리",
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
      className="sticky top-0 z-40 w-full shrink-0 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
    >
      <div className="container mx-auto flex gap-1 overflow-x-auto scrollbar-hide px-4 sm:px-8">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={`${item.href}${preservedQuery}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 hover:border-zinc-300 dark:hover:border-zinc-700",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
