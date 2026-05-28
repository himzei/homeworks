import { NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { RELATED_NEWS_KEYWORDS, type RelatedNewsCategory } from "@/lib/related-news/keywords";
import {
  fetchNaverNewsByQuery,
  normalizeNaverNewsItems,
  type NormalizedRelatedNewsRow,
} from "@/lib/related-news/naver-news";
import { fetchGoogleNewsRssByQuery } from "@/lib/related-news/google-news-rss";
import { enrichRelatedNewsRowsWithImages } from "@/lib/related-news/enrich-news-images";
import { isUsableNewsThumbnailUrl } from "@/lib/related-news/news-thumbnail";
import { filterRelatedNewsRows } from "@/lib/related-news/sl-news-filter";
import type { SupabaseClient } from "@supabase/supabase-js";

type UpsertStats = {
  category: RelatedNewsCategory;
  queries: number;
  fetched: number;
  uniqueByLink: number;
  upserted: number;
};

function normalizeNewsSearchQuery(rawQuery: string): string {
  // 뉴스 검색 키워드 보정
  // - 약어가 그대로 들어가면 기사 제목/본문 매칭이 약해질 수 있어 한글 발음으로 치환합니다.
  // - 단어의 일부(예: "slim", "thnk")까지 잘못 치환하지 않도록, 영숫자 경계를 기준으로만 치환합니다.
  const query = (rawQuery ?? "").trim();
  if (!query) return "";

  const replaceToken = (input: string, token: string, replacement: string) => {
    const tokenRegex = new RegExp(`(^|[^a-zA-Z0-9])${token}([^a-zA-Z0-9]|$)`, "gi");
    return input.replace(tokenRegex, (_match, left: string, right: string) => {
      return `${left}${replacement}${right}`;
    });
  };

  return replaceToken(replaceToken(query, "sl", "에스엘"), "thn", "티에이치엔");
}

function isValidCategory(value: unknown): value is RelatedNewsCategory {
  return value === "sl" || value === "thn" || value === "ajin";
}

function getCronSecretFromRequest(request: Request): string {
  // 일반적으로 Vercel Cron은 Authorization 헤더로 토큰을 넣어줍니다.
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  // 혹시 쿼리로 호출하는 경우도 대비합니다.
  const url = new URL(request.url);
  return (url.searchParams.get("token") || "").trim();
}

async function mergeExistingImageUrls(
  service: SupabaseClient,
  category: RelatedNewsCategory,
  rows: NormalizedRelatedNewsRow[],
): Promise<NormalizedRelatedNewsRow[]> {
  const originLinks = rows.map((row) => row.origin_link);
  if (originLinks.length === 0) return rows;

  const { data: existingRows } = await service
    .from("related_news")
    .select("origin_link, image_url")
    .eq("category", category)
    .in("origin_link", originLinks);

  const imageByLink = new Map(
    (existingRows ?? []).map((row) => [row.origin_link, row.image_url as string | null]),
  );

  return rows.map((row) => {
    const existing = imageByLink.get(row.origin_link) ?? null;
    const merged =
      row.image_url ??
      (existing && isUsableNewsThumbnailUrl(existing, row.origin_link)
        ? existing
        : null);
    return { ...row, image_url: merged };
  });
}

function uniqByOriginLink(rows: NormalizedRelatedNewsRow[]): NormalizedRelatedNewsRow[] {
  // 같은 링크는 여러 키워드에서 중복으로 잡히므로, 링크 기준으로 하나만 남깁니다.
  const byLink = new Map<string, NormalizedRelatedNewsRow>();
  for (const row of rows) {
    const key = `${row.category}::${row.origin_link}`;
    if (!byLink.has(key)) byLink.set(key, row);
  }
  return Array.from(byLink.values());
}

/**
 * 매일 특정 시간에 호출되는 크론 엔드포인트(서버 전용)
 * - 네이버 뉴스 검색 API로 여러 키워드 검색
 * - origin_link 기준으로 중복 제거
 * - Supabase에 upsert로 반영(신규/업데이트 모두 커버)
 *
 * 호출 예:
 * - POST /api/cron/related-news?token=...
 * - POST /api/cron/related-news?token=...&category=sl
 */
export async function POST(request: Request) {
  try {
    const expectedToken = (process.env.CRON_SECRET || "").trim();
    if (!expectedToken) {
      return NextResponse.json(
        { error: "CRON_SECRET 환경변수가 필요합니다." },
        { status: 500 },
      );
    }

    const providedToken = getCronSecretFromRequest(request);
    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다." },
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const categoryParam = url.searchParams.get("category");

    const categories: RelatedNewsCategory[] = isValidCategory(categoryParam)
      ? [categoryParam]
      : (["sl", "thn", "ajin"] as const).slice();

    const stats: UpsertStats[] = [];

    for (const category of categories) {
      const keywords = RELATED_NEWS_KEYWORDS[category]?.queries ?? [];

      // 키워드가 없으면 스킵
      if (keywords.length === 0) {
        stats.push({
          category,
          queries: 0,
          fetched: 0,
          uniqueByLink: 0,
          upserted: 0,
        });
        continue;
      }

      const fetchedRows: NormalizedRelatedNewsRow[] = [];

      // 병렬로 가져오기 (키워드별 검색은 독립)
      const results = await Promise.all(
        keywords.map(async (query) => {
          const normalizedQuery = normalizeNewsSearchQuery(query);
          // 치환 결과가 비어버리면(공백만 있던 경우 등) 안전하게 스킵
          if (!normalizedQuery) return [];

          // 네이버 뉴스 API + Google News RSS를 보조로 함께 수집합니다.
          // - 네이버: 한국 기사에 강함, 제목/요약 품질 좋음
          // - 구글 RSS: 누락 보완/추가 소스 역할
          const [naverRows, googleRows] = await Promise.all([
            (async () => {
              const response = await fetchNaverNewsByQuery({
                query: normalizedQuery,
                display: 50,
                sort: "date",
              });
              return normalizeNaverNewsItems({
                category,
                query: normalizedQuery,
                items: response.items,
              });
            })(),
            (async () => {
              const rows = await fetchGoogleNewsRssByQuery({ query: normalizedQuery, limit: 50 });
              return rows.map(
                (row): NormalizedRelatedNewsRow => ({
                  category,
                  query: normalizedQuery,
                  title: row.title,
                  description: row.description,
                  origin_link: row.origin_link,
                  naver_link: null,
                  published_at: row.published_at,
                  image_url: row.image_url,
                }),
              );
            })(),
          ]);

          return [...naverRows, ...googleRows];
        }),
      );

      for (const rows of results) fetchedRows.push(...rows);

      const uniqueRows = uniqByOriginLink(fetchedRows);
      const filteredRows = filterRelatedNewsRows(uniqueRows);

      // 기사 페이지에서 og:image 등 썸네일 URL 추출
      const enrichedRows = await enrichRelatedNewsRowsWithImages(filteredRows, {
        concurrency: 6,
      });
      const rowsToUpsert = await mergeExistingImageUrls(service, category, enrichedRows);

      // Supabase upsert
      // - unique index: (category, origin_link)
      // - 충돌 시 title/desc/link/published_at/query 등을 최신값으로 업데이트
      const { error: upsertError } = await service
        .from("related_news")
        .upsert(rowsToUpsert, { onConflict: "category,origin_link" });

      if (upsertError) {
        console.error("POST /api/cron/related-news upsert:", upsertError);
        return NextResponse.json(
          { error: upsertError.message ?? "DB 업서트에 실패했습니다." },
          { status: 500 },
        );
      }

      stats.push({
        category,
        queries: keywords.length,
        fetched: fetchedRows.length,
        uniqueByLink: filteredRows.length,
        upserted: rowsToUpsert.length,
      });
    }

    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    console.error("POST /api/cron/related-news:", e);
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

