import AdminPageShell from "@/app/admin/_components/AdminPageShell";

type AdminLayoutProps = {
  children: React.ReactNode;
};

/** 관리자 패널 공통 — 상단 서브메뉴만 표시 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminPageShell>{children}</AdminPageShell>;
}
