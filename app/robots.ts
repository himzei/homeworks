import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * robots.txt — 크롤러 허용·차단 경로
 * 회원·관리자·API는 색인에서 제외
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/profile",
        "/pending-approval",
        "/homework",
        "/progress",
        "/survey",
        "/schedule",
        "/vote/",
        "/ladder/",
        "/user/",
        "/assignment/",
        "/home",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
