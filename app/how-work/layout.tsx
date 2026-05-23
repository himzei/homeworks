import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";

/** 과제제출방법 — 사용방법 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function HowWorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UsageGuideSectionShell>{children}</UsageGuideSectionShell>;
}
