import type { Metadata } from "next";
import CommunitySectionShell from "@/app/_components/CommunitySectionShell";

export const metadata: Metadata = {
  title: "동료평가",
  robots: { index: false, follow: false },
};

/** 동료평가 — 커뮤니티 섹션 공통 레이아웃 */
export default function PeerEvaluationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunitySectionShell>{children}</CommunitySectionShell>;
}
