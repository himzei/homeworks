import { Suspense } from "react";
import SectionSubNav, {
  type SectionSubNavItem,
} from "@/app/_components/SectionSubNav";
import { cn } from "@/lib/utils";

type SectionPageShellProps = {
  children: React.ReactNode;
  subNavItems: SectionSubNavItem[];
  /** 서브내비 배경 (기본: 서브페이지 공통 색상) */
  heroClassName?: string;
};

const defaultHeroClassName = "bg-brand-section";

/** 섹션 공통 레이아웃 (하단 탭 서브메뉴) */
export default function SectionPageShell({
  children,
  subNavItems,
  heroClassName = defaultHeroClassName,
}: SectionPageShellProps) {
  return (
    <div className="flex min-h-full flex-col font-sans">
      <Suspense
        fallback={
          <div
            className={cn("h-10 border-b border-white/20", heroClassName)}
          />
        }
      >
        <SectionSubNav items={subNavItems} heroClassName={heroClassName} />
      </Suspense>
      <div className="flex-1 bg-white dark:bg-black">{children}</div>
    </div>
  );
}
