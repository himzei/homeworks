import { Suspense } from "react";

import AdminSubNav from "@/app/admin/_components/AdminSubNav";

type AdminPageShellProps = {
  children: React.ReactNode;
};

/** 관리자 영역 공통 레이아웃 (서브메뉴는 헤더 바로 아래·전체 너비) */
export default function AdminPageShell({ children }: AdminPageShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 font-sans dark:bg-black">
      <Suspense fallback={null}>
        <AdminSubNav />
      </Suspense>
      <div className="container mx-auto flex-1 px-4 sm:px-8 py-4 sm:py-8">
        {children}
      </div>
    </div>
  );
}
