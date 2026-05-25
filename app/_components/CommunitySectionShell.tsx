import SectionPageShell from "@/app/_components/SectionPageShell";
import { COMMUNITY_SUB_NAV_ITEMS } from "@/lib/navigation";

const communitySubNavItems = COMMUNITY_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 커뮤니티 섹션 공통 레이아웃 (서브메뉴) */
export default function CommunitySectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell subNavItems={communitySubNavItems}>
      {children}
    </SectionPageShell>
  );
}
