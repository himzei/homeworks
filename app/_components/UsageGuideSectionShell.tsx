import SectionPageShell from "@/app/_components/SectionPageShell";
import { USAGE_GUIDE_SUB_NAV_ITEMS } from "@/lib/navigation";

const usageGuideSubNavItems = USAGE_GUIDE_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 사용방법 섹션 공통 레이아웃 (서브메뉴) */
export default function UsageGuideSectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell subNavItems={usageGuideSubNavItems}>
      {children}
    </SectionPageShell>
  );
}
