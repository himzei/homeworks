import CommunitySectionShell from "@/app/_components/CommunitySectionShell";

/** 사다리게임 — 커뮤니티 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function LadderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunitySectionShell>{children}</CommunitySectionShell>;
}
