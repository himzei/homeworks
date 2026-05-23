"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getHeaderNavItems,
  isHeaderNavItemActive,
  type HeaderNavItem,
} from "@/lib/navigation";

type HeaderNavProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

function NavLink({
  item,
  isActive,
  onNavigate,
  className,
}: {
  item: HeaderNavItem;
  isActive: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const linkClassName = cn(
    "inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
    isActive
      ? "bg-zinc-100 text-black dark:bg-zinc-800 dark:text-zinc-50"
      : "text-zinc-600 hover:text-black hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900",
    className,
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={linkClassName}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={linkClassName}
    >
      {item.label}
    </Link>
  );
}

/** 프로젝트 라우트 기준 헤더 내비게이션 */
export default function HeaderNav({ isLoggedIn, isAdmin }: HeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTab = searchParams.get("tab");
  const navItems = getHeaderNavItems({ isLoggedIn, isAdmin });

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav aria-label="주요 메뉴" className="w-full sm:w-auto">
      {/* 데스크톱: 가로 메뉴 */}
      <div className="hidden md:flex items-center gap-1 flex-wrap">
        {navItems.map((item) => (
          <NavLink
            key={`${item.href}-${item.label}`}
            item={item}
            isActive={isHeaderNavItemActive(item, pathname, currentTab)}
          />
        ))}
      </div>

      {/* 모바일: 햄버거 + 펼침 패널 */}
      <div className="md:hidden w-full">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          aria-expanded={isMobileMenuOpen}
          aria-controls="header-mobile-menu"
        >
          {isMobileMenuOpen ? (
            <X className="size-4" aria-hidden />
          ) : (
            <Menu className="size-4" aria-hidden />
          )}
          메뉴
        </button>

        {isMobileMenuOpen ? (
          <div
            id="header-mobile-menu"
            className="mt-2 flex flex-col gap-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
          >
            {navItems.map((item) => (
              <NavLink
                key={`mobile-${item.href}-${item.label}`}
                item={item}
                isActive={isHeaderNavItemActive(item, pathname, currentTab)}
                onNavigate={closeMobileMenu}
                className="w-full justify-start"
              />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
