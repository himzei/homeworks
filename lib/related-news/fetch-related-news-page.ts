import type { SupabaseClient } from "@supabase/supabase-js";

import { RELATED_NEWS_PAGE_SIZE } from "@/lib/related-news/constants";
import type { RelatedNewsCategory } from "@/lib/related-news/keywords";

export type RelatedNewsListItem = {
  id: string;
  title: string;
  description: string | null;
  origin_link: string;
  naver_link: string | null;
  published_at: string | null;
  image_url: string | null;
};

export type RelatedNewsPageResult = {
  items: RelatedNewsListItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
};

/**
 * 관련뉴스 목록 — 서버 페이지네이션 (12건/페이지)
 */
export async function fetchRelatedNewsPage(
  supabase: SupabaseClient,
  params: {
    category: RelatedNewsCategory;
    page?: number;
  },
): Promise<RelatedNewsPageResult> {
  const rawPage = params.page ?? 1;
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const { count, error: countError } = await supabase
    .from("related_news")
    .select("id", { count: "exact", head: true })
    .eq("category", params.category);

  if (countError) {
    console.error(`[${params.category}] 관련뉴스 count 오류:`, countError);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RELATED_NEWS_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const rangeFrom = (currentPage - 1) * RELATED_NEWS_PAGE_SIZE;
  const rangeTo = rangeFrom + RELATED_NEWS_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("related_news")
    .select(
      "id, title, description, origin_link, naver_link, published_at, image_url",
    )
    .eq("category", params.category)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(rangeFrom, rangeTo);

  if (error) {
    console.error(`[${params.category}] 관련뉴스 조회 오류:`, error);
  }

  return {
    items: (data ?? []) as RelatedNewsListItem[],
    currentPage,
    totalPages,
    totalCount,
  };
}
