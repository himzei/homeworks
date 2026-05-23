import AssignmentSectionShell from "@/app/_components/AssignmentSectionShell";

/** 진행과정 — 과제 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AssignmentSectionShell>{children}</AssignmentSectionShell>;
}
