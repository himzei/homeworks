import type { Metadata } from "next";
import AdminPageShell from "@/app/admin/_components/AdminPageShell";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

type AdminLayoutProps = {
  children: React.ReactNode;
};

/** 관리자 패널 공통 — 상단 서브메뉴만 표시 (검색 색인 제외) */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminPageShell>{children}</AdminPageShell>;
}
