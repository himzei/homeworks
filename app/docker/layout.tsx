import UsageGuideSectionShell from "@/app/_components/UsageGuideSectionShell";
import { buildGuidePageJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata = createPageMetadata({
  title: "도커",
  description:
    "AWS EC2 생성·접속(키 페어·탄력적 IP)부터 도커 컨테이너에서 쓰는 리눅스 기본 명령어(whoami·pwd·ls·cat·rm·ps·cp), apt-get 패키지 관리, VIM 사용법을 정리했습니다.",
  path: "/docker",
});

/** 도커 — 사용방법 섹션 서브메뉴 공통 레이아웃 */
export default function DockerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const guideJsonLd = buildGuidePageJsonLd({
    path: "/docker",
    name: "AWS EC2·도커 리눅스 명령어 가이드",
    description:
      "AWS EC2 서버 생성과 SSH 접속, 셸 기본 명령어, 도커 컨테이너 접속, 파일·프로세스 명령어, apt-get 패키지 관리, VIM 사용법을 단계별로 안내합니다.",
  });

  return (
    <UsageGuideSectionShell>
      <JsonLd graph={guideJsonLd} />
      {children}
    </UsageGuideSectionShell>
  );
}
