import type { Metadata } from "next";
import CommunitySectionShell from "@/app/_components/CommunitySectionShell";

export const metadata: Metadata = {
  title: "기업(문의)",
  robots: { index: false, follow: false },
};

/** 기업(문의) — 커뮤니티 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function CompanyInquiryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunitySectionShell>{children}</CommunitySectionShell>;
}

