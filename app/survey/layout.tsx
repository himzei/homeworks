import CommunitySectionShell from "@/app/_components/CommunitySectionShell";

/** 설문조사 — 커뮤니티 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunitySectionShell>{children}</CommunitySectionShell>;
}
