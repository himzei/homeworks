"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionSubNavItem = {
  href: string;
  label: string;
};

type SectionSubNavProps = {
  items: SectionSubNavItem[];
  /** 이동 시 유지할 쿼리 키 (예: 관리자 group 필터) */
  preserveQueryKeys?: string[];
  /** 히어로와 동일한 그라데이션 (sticky 시 배경 유지) */
  heroClassName?: string;
  className?: string;
};

/** 히어로 하단 가로 서브메뉴 (매일경제 스타일 탭) */
export default function SectionSubNav({
  items,
  preserveQueryKeys = ["group"],
  heroClassName,
  className,
}: SectionSubNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildHref = (href: string) => {
    const params = new URLSearchParams();
    for (const key of preserveQueryKeys) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `${href}?${query}` : href;
  };

  return (
    <nav
      aria-label="섹션 하위 메뉴"
      className={cn(
        // 스크롤 시 뷰포트 상단(top: 0)에 고정
        "sticky top-0 z-40 border-b border-white/20 shadow-sm text-white",
        heroClassName ?? "bg-brand-section",
        className,
      )}
    >
      <ul className="flex items-stretch justify-center gap-2 px-2">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={buildHref(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center px-3 py-2 sm:py-2.5",
                  "text-sm font-medium text-white/85 hover:text-white transition-colors",
                  isActive && "text-white",
                )}
              >
                {item.label}
                {isActive ? (
                  <span
                    className="absolute bottom-0 left-1/2 h-0.5 w-[calc(100%-0.5rem)] max-w-16 -translate-x-1/2 rounded-t-sm bg-white"
                    aria-hidden
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
