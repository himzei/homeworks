import SectionPageShell from "@/app/_components/SectionPageShell";
import { ASSIGNMENT_SUB_NAV_ITEMS } from "@/lib/navigation";

const assignmentSubNavItems = ASSIGNMENT_SUB_NAV_ITEMS.flatMap((item) =>
  item.href ? [{ href: item.href, label: item.label }] : [],
);

/** 과제 섹션 공통 레이아웃 (서브메뉴) */
export default function AssignmentSectionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SectionPageShell subNavItems={assignmentSubNavItems}>
      {children}
    </SectionPageShell>
  );
}
