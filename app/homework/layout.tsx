import type { Metadata } from "next";
import AssignmentSectionShell from "@/app/_components/AssignmentSectionShell";

export const metadata: Metadata = {
  title: "오늘의 과제",
  robots: { index: false, follow: false },
};

/** 오늘의 과제 — 과제 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function HomeworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AssignmentSectionShell>{children}</AssignmentSectionShell>;
}
