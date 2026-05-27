import { isLikelyImageFileUrl } from "@/lib/related-news/article-image";
import {
  isGenericGoogleNewsOgImage,
  isGoogleNewsArticleUrl,
} from "@/lib/related-news/google-news-url";

/**
 * DB/ RSS에 저장된 image_url을 그대로 써도 되는지 판별합니다.
 * - Google 공통 로고(플레이스홀더)는 재수집 대상
 * - Google News 링크인데 유효한 이미지 URL이 아니면 재수집
 */
export function isUsableNewsThumbnailUrl(
  imageUrl: string | null | undefined,
  originLink: string,
): boolean {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return false;
  if (isGenericGoogleNewsOgImage(trimmed)) return false;
  if (isGoogleNewsArticleUrl(originLink) && !isLikelyImageFileUrl(trimmed)) {
    return false;
  }
  return isLikelyImageFileUrl(trimmed);
}

/**
 * enrich 단계에서 og:image 등을 다시 가져와야 하는지 여부
 */
export function shouldEnrichNewsThumbnail(
  imageUrl: string | null | undefined,
  originLink: string,
): boolean {
  return !isUsableNewsThumbnailUrl(imageUrl, originLink);
}
