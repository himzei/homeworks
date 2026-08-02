import type { Metadata } from "next";

/** 사이트 브랜드명 — 검색 노출·OG 공통 */
export const SITE_NAME = "빅데이터 전문가 양성과정";

/** 메타 설명 (155자 내외 권장) */
export const SITE_DESCRIPTION =
  "빅데이터 전문가 양성과정 — K-Digital Training 기반 AI·데이터 분석 실무 교육. Git 과제 제출, 학습 진행, 교육일정을 한곳에서 관리합니다.";

/** 검색 키워드 힌트 (Google은 참고용으로만 사용) */
export const SITE_KEYWORDS = [
  "빅데이터 전문가 양성과정",
  "빅데이터 전문가",
  "AI 빅데이터 교육",
  "데이터 분석 교육",
  "K-Digital Training",
  "K디지털 트레이닝",
  "빅데이터 양성",
  "데이터 전문가 교육",
  "빅데이터 실무",
] as const;

/** Google Search Console 등록 시 .env에 설정 */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

/**
 * 프로덕션 절대 URL (metadataBase, canonical, sitemap)
 * NEXT_PUBLIC_SITE_URL 미설정 시 Vercel 배포 URL → 로컬 fallback
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured?.startsWith("http")) {
    return configured.replace(/\/$/, "");
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  return "http://localhost:3000";
}

/** 경로를 절대 URL로 변환 */
export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

type PageMetadataOptions = {
  /** 브라우저 탭·검색 결과 제목 (사이트명은 template으로 자동 접미) */
  title: string;
  description: string;
  /** canonical·OG url용 경로 (예: "/blog") */
  path: string;
  /** 회원 전용·관리자 페이지 등 색인 제외 */
  noIndex?: boolean;
  /** OG 이미지 경로 (기본: /opengraph-image) */
  ogImagePath?: string;
};

/** 하위 페이지 공통 메타데이터 생성 */
export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  ogImagePath = "/opengraph-image",
}: PageMetadataOptions): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const ogImageUrl = absoluteUrl(ogImagePath);

  return {
    title,
    description,
    keywords: [...SITE_KEYWORDS],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [ogImageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/** 루트 layout용 기본 메타데이터 */
export function createRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const homeUrl = absoluteUrl("/");
  const ogImageUrl = absoluteUrl("/opengraph-image");

  const verification: Metadata["verification"] = GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} | K-Digital Training AI·데이터 분석 교육`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [...SITE_KEYWORDS],
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "education",
    alternates: {
      canonical: homeUrl,
      languages: {
        "ko-KR": homeUrl,
      },
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: homeUrl,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification,
    other: {
      // 네이버·다음 등 국내 검색엔진 보조 (선택)
      subject: SITE_NAME,
    },
  };
}

/** sitemap에 포함할 공개(색인 대상) 경로 */
export const PUBLIC_SITEMAP_PATHS = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/git-how", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/how-work", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/group-github", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/docker", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly" as const, priority: 0.7 },
] as const;
