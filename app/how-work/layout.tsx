import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";
import { buildGuidePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata = createPageMetadata({
  title: "과제 제출 방법",
  description:
    "빅데이터 전문가 양성과정 과제 제출 가이드. GitHub Secret Gist 작성부터 himzei 플랫폼 URL 제출·확인 메일까지 단계별 안내.",
  path: "/how-work",
});

/** 과제제출방법 — 사용방법 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function HowWorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guideJsonLd = buildGuidePageJsonLd({
    path: "/how-work",
    name: "빅데이터 전문가 양성과정 과제 제출 방법",
    description:
      "GitHub Gist로 과제를 작성하고 빅데이터 전문가 양성과정 플랫폼에 제출하는 방법을 안내합니다.",
  });

  return (
    <UsageGuideSectionShell>
      <JsonLd graph={guideJsonLd} />
      {children}
    </UsageGuideSectionShell>
  );
}
