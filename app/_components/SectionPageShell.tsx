"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import SectionSubNav, {
  type SectionSubNavItem,
} from "@/app/_components/SectionSubNav";
import { cn } from "@/lib/utils";

export type SectionPageMeta = Record<
  string,
  { title: string; description: string }
>;

type SectionPageShellProps = {
  children: React.ReactNode;
  /** 섹션 라벨 (예: 과제, 커뮤니티) */
  sectionLabel: string;
  pageMeta: SectionPageMeta;
  subNavItems: SectionSubNavItem[];
  defaultPath: string;
  /** 히어로·서브내비 배경 (기본: 서브페이지 공통 색상) */
  heroClassName?: string;
};

const defaultHeroClassName = "bg-brand-section";

function SectionHero({
  sectionLabel,
  pageMeta,
  defaultPath,
  heroClassName,
}: Pick<
  SectionPageShellProps,
  "sectionLabel" | "pageMeta" | "defaultPath" | "heroClassName"
>) {
  const pathname = usePathname();
  const page = pageMeta[pathname] ?? pageMeta[defaultPath];
  const heroBackgroundClassName = heroClassName ?? defaultHeroClassName;

  return (
    <section className={cn("text-white", heroBackgroundClassName)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-4 sm:pb-6">
        <p className="text-sm text-white/80 mb-2">{sectionLabel}</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          {page.title}
        </h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
          {page.description}
        </p>
      </div>
    </section>
  );
}

/** 섹션 공통 레이아웃 (히어로 + 하단 탭 서브메뉴) */
export default function SectionPageShell({
  children,
  sectionLabel,
  pageMeta,
  subNavItems,
  defaultPath,
  heroClassName = defaultHeroClassName,
}: SectionPageShellProps) {
  return (
    <div className="flex min-h-full flex-col font-sans">
      <SectionHero
        sectionLabel={sectionLabel}
        pageMeta={pageMeta}
        defaultPath={defaultPath}
        heroClassName={heroClassName}
      />
      {/* 히어로 밖에 두어 본문 스크롤 내내 sticky top-0 유지 */}
      <Suspense
        fallback={
          <div
            className={cn(
              "h-14 border-t border-white/20",
              heroClassName,
            )}
          />
        }
      >
        <SectionSubNav items={subNavItems} heroClassName={heroClassName} />
      </Suspense>
      <div className="flex-1 bg-white dark:bg-black">{children}</div>
    </div>
  );
}
