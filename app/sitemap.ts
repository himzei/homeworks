import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, getSiteUrl } from "@/lib/seo/site";

/**
 * sitemap.xml — Google에 색인할 공개 페이지만 등록
 * (회원 전용·리다이렉트 경로는 제외)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_SITEMAP_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
