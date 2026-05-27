import type { Metadata } from "next";

import SectionPageShell from "@/app/_components/SectionPageShell";

export const metadata: Metadata = {
  title: "관련뉴스",
  robots: { index: false, follow: false },
};

const relatedNewsSubNavItems = [
  { href: "/related-news/sl", label: "SL" },
  { href: "/related-news/thn", label: "THN" },
  { href: "/related-news/ajin", label: "아진산업" },
];

/** 관련뉴스 섹션 — 스크린샷과 같은 상단 가로 탭 서브메뉴 */
export default function RelatedNewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SectionPageShell subNavItems={relatedNewsSubNavItems}>{children}</SectionPageShell>;
}

