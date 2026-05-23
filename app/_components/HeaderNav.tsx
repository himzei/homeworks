"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getHeaderNavItems,
  isHeaderNavChildActive,
  isHeaderNavItemActive,
  type HeaderNavItem,
} from "@/lib/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type HeaderNavProps = {
  isLoggedIn: boolean;
  /** desktop: 가로 메뉴만, mobile: 햄버거만, all: 반응형 전체 */
  display?: "all" | "desktop" | "mobile";
};

/** 메뉴 버튼 공통 — 열림/포커스 시에도 박스 크기가 변하지 않도록 border·ring inset 고정 */
const navButtonClassName = (isActive: boolean, className?: string) =>
  cn(
    "inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap",
    "border border-transparent outline-none",
    "transition-[color,background-color] duration-150",
    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30",
    isActive
      ? "bg-white/15 text-white"
      : [
          "text-brand-cream/70",
          "hover:text-brand-cream hover:bg-white/10",
          "data-[state=open]:text-brand-cream data-[state=open]:bg-white/10",
        ],
    className,
  );

const navLinkClassName = navButtonClassName;

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
  const linkClassName = navLinkClassName(isActive, className);

  if (item.external && item.href) {
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

  if (!item.href) return null;

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

/** 드롭다운 메뉴 (데스크톱) */
function NavDropdown({
  item,
  pathname,
  currentTab,
}: {
  item: HeaderNavItem;
  pathname: string;
  currentTab: string | null;
}) {
  const isActive = isHeaderNavItemActive(item, pathname, currentTab);
  const children = item.children ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(navButtonClassName(isActive), "group gap-1")}
          aria-label={`${item.label} 메뉴`}
        >
          {item.label}
          <ChevronDown
            className="size-4 shrink-0 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-40 data-[state=open]:zoom-in-100 data-[state=open]:slide-in-from-top-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-top-0"
      >
        {children.map((child) => {
          const childActive = isHeaderNavChildActive(
            child,
            pathname,
            currentTab,
          );

          if (!child.href) return null;

          return (
            <DropdownMenuItem key={child.href} asChild>
              <Link
                href={child.href}
                aria-current={childActive ? "page" : undefined}
                className={cn(
                  "cursor-pointer",
                  childActive && "bg-accent/10 text-accent font-medium",
                )}
              >
                {child.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 드롭다운 메뉴 (모바일 — 하위 링크 펼침) */
function NavDropdownMobile({
  item,
  pathname,
  currentTab,
  onNavigate,
}: {
  item: HeaderNavItem;
  pathname: string;
  currentTab: string | null;
  onNavigate?: () => void;
}) {
  const isActive = isHeaderNavItemActive(item, pathname, currentTab);
  const children = item.children ?? [];

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "px-3 py-2 text-xs font-semibold uppercase tracking-wide",
          isActive
            ? "text-brand-cream"
            : "text-brand-cream/50",
        )}
      >
        {item.label}
      </span>
      {children.map((child) => (
        <NavLink
          key={child.href ?? child.label}
          item={child}
          isActive={isHeaderNavChildActive(child, pathname, currentTab)}
          onNavigate={onNavigate}
          className="w-full justify-start pl-6"
        />
      ))}
    </div>
  );
}

function NavEntry({
  item,
  pathname,
  currentTab,
  onNavigate,
  variant,
}: {
  item: HeaderNavItem;
  pathname: string;
  currentTab: string | null;
  onNavigate?: () => void;
  variant: "desktop" | "mobile";
}) {
  const entryKey = item.href ?? item.label;

  if (item.children?.length) {
    if (variant === "desktop") {
      return (
        <NavDropdown
          key={entryKey}
          item={item}
          pathname={pathname}
          currentTab={currentTab}
        />
      );
    }

    return (
      <NavDropdownMobile
        key={entryKey}
        item={item}
        pathname={pathname}
        currentTab={currentTab}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <NavLink
      key={entryKey}
      item={item}
      isActive={isHeaderNavItemActive(item, pathname, currentTab)}
      onNavigate={onNavigate}
      className={variant === "mobile" ? "w-full justify-start" : undefined}
    />
  );
}

/** 프로젝트 라우트 기준 헤더 내비게이션 */
export default function HeaderNav({
  isLoggedIn,
  display = "all",
}: HeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTab = searchParams.get("tab");
  const navItems = getHeaderNavItems({ isLoggedIn });

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const showDesktop = display === "all" || display === "desktop";
  const showMobile = display === "all" || display === "mobile";

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn(display === "desktop" ? "w-auto" : "w-full sm:w-auto")}
    >
      {/* 데스크톱: 가로 메뉴 */}
      {showDesktop ? (
        <div
          className={cn(
            "items-center gap-1 flex-nowrap",
            display === "all" ? "hidden md:flex" : "flex",
          )}
        >
        {navItems.map((item) => (
          <NavEntry
            key={item.href ?? item.label}
            item={item}
            pathname={pathname}
            currentTab={currentTab}
            variant="desktop"
          />
        ))}
        </div>
      ) : null}

      {/* 모바일: 햄버거 + 펼침 패널 */}
      {showMobile ? (
        <div className={cn(display === "all" && "md:hidden w-full")}>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-cream/80 border border-white/20 rounded-lg hover:bg-white/10 hover:text-brand-cream transition-colors"
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
            className="mt-2 flex flex-col gap-1 p-2 rounded-lg border border-white/10 bg-brand-blue/20"
          >
            {navItems.map((item) => (
              <NavEntry
                key={`mobile-${item.href ?? item.label}`}
                item={item}
                pathname={pathname}
                currentTab={currentTab}
                onNavigate={closeMobileMenu}
                variant="mobile"
              />
            ))}
          </div>
        ) : null}
        </div>
      ) : null}
    </nav>
  );
}
