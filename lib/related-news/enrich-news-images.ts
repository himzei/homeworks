import { fetchArticleImageUrl } from "@/lib/related-news/article-image";
import { shouldEnrichNewsThumbnail } from "@/lib/related-news/news-thumbnail";

export type RelatedNewsRowWithImage = {
  origin_link: string;
  naver_link?: string | null;
  image_url?: string | null;
};

/**
 * 수집된 뉴스 행에 썸네일(image_url)을 채웁니다.
 * - 유효한 image_url이 있으면 스킵(재수집 시 API 부하 절감)
 * - Google 공통 로고·무효 URL은 다시 수집
 * - 동시 요청 수를 제한해 서버/외부 사이트 부하를 줄입니다.
 */
export async function enrichRelatedNewsRowsWithImages<
  T extends RelatedNewsRowWithImage,
>(rows: T[], options?: { concurrency?: number }): Promise<(T & { image_url: string | null })[]> {
  const concurrency = Math.max(1, options?.concurrency ?? 6);
  const result: (T & { image_url: string | null })[] = new Array(rows.length);

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= rows.length) break;

      const row = rows[index];
      if (!shouldEnrichNewsThumbnail(row.image_url, row.origin_link)) {
        result[index] = { ...row, image_url: row.image_url!.trim() };
        continue;
      }

      const imageUrl = await fetchArticleImageUrl(row.origin_link, {
        fallbackUrl: row.naver_link,
      });

      result[index] = { ...row, image_url: imageUrl };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
  );

  return result;
}
