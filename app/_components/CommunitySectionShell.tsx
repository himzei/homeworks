import SectionPageShell from "@/app/_components/SectionPageShell";
import {
  COMMUNITY_SECTION_PAGE_META,
  COMMUNITY_SUB_NAV_ITEMS,
} from "@/lib/navigation";

const communitySubNavItems = COMMUNITY_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 커뮤니티 섹션 공통 레이아웃 (히어로 + 서브메뉴) */
export default function CommunitySectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell
      sectionLabel="커뮤니티"
      pageMeta={COMMUNITY_SECTION_PAGE_META}
      subNavItems={communitySubNavItems}
      defaultPath="/survey"
    >
      {children}
    </SectionPageShell>
  );
}
