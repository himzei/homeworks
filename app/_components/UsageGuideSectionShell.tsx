import SectionPageShell from "@/app/_components/SectionPageShell";
import {
  GIT_HOW_PATH,
  USAGE_GUIDE_SECTION_PAGE_META,
  USAGE_GUIDE_SUB_NAV_ITEMS,
} from "@/lib/navigation";

const usageGuideSubNavItems = USAGE_GUIDE_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 사용방법 섹션 공통 레이아웃 (히어로 + 서브메뉴) */
export default function UsageGuideSectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell
      sectionLabel="사용방법"
      pageMeta={USAGE_GUIDE_SECTION_PAGE_META}
      subNavItems={usageGuideSubNavItems}
      defaultPath={GIT_HOW_PATH}
    >
      {children}
    </SectionPageShell>
  );
}
