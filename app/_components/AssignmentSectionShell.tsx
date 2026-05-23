import SectionPageShell from "@/app/_components/SectionPageShell";
import {
  ASSIGNMENT_SECTION_PAGE_META,
  ASSIGNMENT_SUB_NAV_ITEMS,
} from "@/lib/navigation";

const assignmentSubNavItems = ASSIGNMENT_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 과제 섹션 공통 레이아웃 (히어로 + 서브메뉴) */
export default function AssignmentSectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell
      sectionLabel="과제"
      pageMeta={ASSIGNMENT_SECTION_PAGE_META}
      subNavItems={assignmentSubNavItems}
      defaultPath="/homework"
    >
      {children}
    </SectionPageShell>
  );
}
