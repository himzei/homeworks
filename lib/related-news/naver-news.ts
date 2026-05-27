import type { RelatedNewsCategory } from "./keywords";
import {
  normalizeNewsDescription,
  stripHtmlToPlainText,
} from "@/lib/related-news/plain-text";

type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

type NaverNewsSearchResponse = {
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
};

export type NormalizedRelatedNewsRow = {
  category: RelatedNewsCategory;
  query: string;
  title: string;
  description: string | null;
  origin_link: string;
  naver_link: string | null;
  published_at: string | null; // ISO
  image_url?: string | null;
};

function safeToIso(pubDate: string): string | null {
  // 예: "Wed, 27 May 2026 08:30:00 +0900"
  const time = Date.parse(pubDate);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

/**
 * 네이버 뉴스 검색 API 호출.
 * - display는 최대 100.
 * - sort: sim(유사도) / date(날짜)
 */
export async function fetchNaverNewsByQuery(params: {
  query: string;
  display?: number;
  sort?: "sim" | "date";
}): Promise<NaverNewsSearchResponse> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다.");
  }

  const display = typeof params.display === "number" ? params.display : 50;
  const sort = params.sort ?? "date";

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", params.query);
  url.searchParams.set("display", String(Math.min(Math.max(display, 1), 100)));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", sort);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    // 서버에서 주기적으로 호출되는 작업이라 캐시는 끕니다.
    cache: "no-store",
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `네이버 뉴스 API 호출 실패 (status=${response.status}) ${bodyText}`.trim(),
    );
  }

  const data = (await response.json()) as NaverNewsSearchResponse;
  if (!data || !Array.isArray(data.items)) {
    throw new Error("네이버 뉴스 API 응답 형식이 올바르지 않습니다.");
  }

  return data;
}

export function normalizeNaverNewsItems(params: {
  category: RelatedNewsCategory;
  query: string;
  items: NaverNewsItem[];
}): NormalizedRelatedNewsRow[] {
  return params.items
    .map((item) => {
      const origin = (item.originallink || "").trim();
      const naver = (item.link || "").trim();

      // 링크가 없으면 저장할 수 없어서 제외
      if (!origin) return null;

      const title = stripHtmlToPlainText(item.title || "");
      const normalized: NormalizedRelatedNewsRow = {
        category: params.category,
        query: params.query,
        title,
        description: normalizeNewsDescription(item.description || "", title),
        origin_link: origin,
        naver_link: naver || null,
        published_at: safeToIso(item.pubDate || ""),
      };

      // 제목이 비면 품질이 너무 낮아서 제외
      if (!normalized.title) return null;

      return normalized;
    })
    .filter((row): row is NormalizedRelatedNewsRow => Boolean(row));
}

