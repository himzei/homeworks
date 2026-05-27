type GoogleNewsRssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl: string | null;
};

export type NormalizedGoogleNewsRow = {
  title: string;
  description: string | null;
  origin_link: string;
  published_at: string | null; // ISO
  image_url: string | null;
};

import {
  normalizeNewsDescription,
  stripHtmlToPlainText,
} from "@/lib/related-news/plain-text";
import { isUsableNewsThumbnailUrl } from "@/lib/related-news/news-thumbnail";

function stripCdata(text: string): string {
  return text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function safeToIso(pubDate: string): string | null {
  const time = Date.parse(pubDate);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

/**
 * 매우 단순한 RSS XML 파서 (의존성 추가 없이 사용)
 * - Google News RSS의 <item> 구조만 최소한으로 파싱합니다.
 * - XML이 깨졌거나 포맷이 바뀌면 안전하게 빈 배열을 반환합니다.
 */
function parseGoogleNewsRss(xmlText: string): GoogleNewsRssItem[] {
  if (!xmlText) return [];

  const items: GoogleNewsRssItem[] = [];
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of itemBlocks) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const description = (block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const mediaContent =
      block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ??
      "";

    const cleanTitle = stripHtmlToPlainText(stripCdata(title));
    const cleanLink = stripCdata(link).trim();
    const cleanDescription =
      normalizeNewsDescription(stripCdata(description), cleanTitle) ?? "";

    // 링크/제목이 없으면 사용 불가
    if (!cleanTitle || !cleanLink) continue;

    items.push({
      title: cleanTitle,
      link: cleanLink,
      description: cleanDescription,
      pubDate,
      imageUrl: stripCdata(mediaContent).trim() || null,
    });
  }

  return items;
}

/**
 * Google News RSS 검색
 * - 한국어 기준(hl=ko, gl=KR, ceid=KR:ko)으로 설정
 */
export async function fetchGoogleNewsRssByQuery(params: {
  query: string;
  /** RSS 최대 아이템 수 제한(클라이언트 측 필터링) */
  limit?: number;
}): Promise<NormalizedGoogleNewsRow[]> {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", params.query);
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "KR");
  url.searchParams.set("ceid", "KR:ko");

  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `Google News RSS 호출 실패 (status=${response.status}) ${bodyText}`.trim(),
    );
  }

  const xmlText = await response.text();
  const rawItems = parseGoogleNewsRss(xmlText);
  const limit = typeof params.limit === "number" ? Math.max(params.limit, 1) : 50;

  return rawItems.slice(0, limit).map((item) => {
    const originLink = item.link;
    const rssImage =
      item.imageUrl && isUsableNewsThumbnailUrl(item.imageUrl, originLink)
        ? item.imageUrl
        : null;

    return {
      title: item.title,
      description: normalizeNewsDescription(item.description, item.title),
      // Google News RSS의 link는 news.google.com 리다이렉트 — 썸네일은 enrich에서 원문 og:image로 보완
      origin_link: originLink,
      published_at: safeToIso(item.pubDate),
      image_url: rssImage,
    };
  });
}

