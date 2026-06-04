import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";
import { buildGuidePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata = createPageMetadata({
  title: "그룹 깃허브",
  description:
    "빅데이터 전문가 양성과정 그룹 GitHub 조직 가입, 팀 저장소 협업, 프로필·조별 프로젝트 URL 등록 방법을 안내합니다.",
  path: "/group-github",
});

/** 그룹 깃허브 — 사용방법 섹션 히어로·서브메뉴 공통 레이아웃 */
export default function GroupGithubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guideJsonLd = buildGuidePageJsonLd({
    path: "/group-github",
    name: "빅데이터 전문가 양성과정 그룹 GitHub 가이드",
    description:
      "교육 과정 GitHub Organization 가입부터 팀 프로젝트 저장소 협업·URL 등록까지 단계별로 안내합니다.",
  });

  return (
    <UsageGuideSectionShell>
      <JsonLd graph={guideJsonLd} />
      {children}
    </UsageGuideSectionShell>
  );
}
