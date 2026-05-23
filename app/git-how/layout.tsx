import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";

/** 깃이란? — 사용방법 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function GitHowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UsageGuideSectionShell>{children}</UsageGuideSectionShell>;
}
