import type { MetadataRoute } from "next";

/**
 * robots.txt 생성 - 검색엔진 크롤러가 수집할 수 있는 경로 안내
 * 빅데이터 전문가 양성과정 사이트 SEO 지원
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/assignment/new", "/assignment/edit/"],
    },
    sitemap: "/sitemap.xml",
  };
}
