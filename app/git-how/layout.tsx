import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";
import { buildGuidePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata = createPageMetadata({
  title: "깃(Git)이란?",
  description:
    "빅데이터 전문가 양성과정 Git 기초 가이드. 버전 관리 개념, GitHub·Gist 사용법, 과제 제출 전 필수 개념을 정리했습니다.",
  path: "/git-how",
});

/** 깃이란? — 사용방법 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function GitHowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guideJsonLd = buildGuidePageJsonLd({
    path: "/git-how",
    name: "빅데이터 전문가 양성과정 Git 기초 — 깃이란?",
    description:
      "빅데이터 전문가 양성과정 교육생을 위한 Git·GitHub·Gist 입문 가이드입니다.",
  });

  return (
    <UsageGuideSectionShell>
      <JsonLd graph={guideJsonLd} />
      {children}
    </UsageGuideSectionShell>
  );
}
