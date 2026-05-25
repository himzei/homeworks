import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absoluteUrl,
  getSiteUrl,
} from "@/lib/seo/site";

type JsonLdGraphItem = Record<string, unknown>;

/** 구조화 데이터(JSON-LD) — Google 리치 결과·과정 정보 */
export function buildHomePageJsonLd(): JsonLdGraphItem[] {
  const siteUrl = getSiteUrl();

  return [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: siteUrl,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
    },
    {
      "@type": "Course",
      "@id": `${siteUrl}/#course`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
      provider: { "@id": `${siteUrl}/#organization` },
      url: siteUrl,
      educationalLevel: "Professional",
      teaches: [
        "빅데이터",
        "데이터 분석",
        "인공지능(AI)",
        "Python",
        "Git",
      ],
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#course` },
      inLanguage: "ko-KR",
    },
  ];
}

type GuidePageJsonLdOptions = {
  path: string;
  name: string;
  description: string;
};

/** 가이드 페이지(깃이란, 과제제출방법)용 Article 스키마 */
export function buildGuidePageJsonLd({
  path,
  name,
  description,
}: GuidePageJsonLdOptions): JsonLdGraphItem[] {
  const pageUrl = absoluteUrl(path);

  return [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name,
      description,
      inLanguage: "ko-KR",
      isPartOf: { "@id": `${getSiteUrl()}/#website` },
    },
    {
      "@type": "Article",
      headline: name,
      description,
      url: pageUrl,
      inLanguage: "ko-KR",
      author: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  ];
}

type JsonLdProps = {
  graph: JsonLdGraphItem[];
};

/** JSON-LD script 태그 렌더 */
export function JsonLd({ graph }: JsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
