export type RelatedNewsCategory = "sl" | "thn" | "ajin";

type CategoryKeywordConfig = {
  /** 네이버 뉴스 검색 API에 넣을 검색어 목록 */
  queries: string[];
};

/**
 * 카테고리별 연관 키워드 세트.
 * - SL은 대구 소재 에스엘(기업) 기준. 단독 "SL" 검색은 SL모터스·SL공사 등 노이즈가 많아 사용하지 않습니다.
 * - 무관 기사는 sl-news-filter.ts에서 추가로 제외합니다.
 */
export const RELATED_NEWS_KEYWORDS: Record<RelatedNewsCategory, CategoryKeywordConfig> = {
  sl: {
    queries: [
      "에스엘 대구",
      "에스엘(기업) 대구",
      "에스엘",
      "에스엘(기업)",
      "에스엘 자동차부품",
      "에스엘 주가",
      "SL 대구",
    ],
  },
  thn: {
    queries: ["THN", "티에이치엔", "THN(기업)", "THN 주가", "티에이치엔 주가"],
  },
  ajin: {
    queries: ["아진산업", "아진산업 주가", "아진산업(기업)"],
  },
};

