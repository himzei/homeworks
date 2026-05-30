import type { Metadata } from "next";
import AdminPageShell from "@/app/admin/_components/AdminPageShell";
import { getCachedStudentCountsByGroup } from "@/lib/admin/student-counts-by-group";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

type AdminLayoutProps = {
  children: React.ReactNode;
};

/** 관리자 패널 공통 — 상단 서브메뉴 + 요청당 1회 학생 수 집계 캐시 워밍 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await getCachedStudentCountsByGroup();

  return <AdminPageShell>{children}</AdminPageShell>;
}
