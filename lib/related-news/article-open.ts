import { isGoogleNewsArticleUrl } from "@/lib/related-news/google-news-url";

type ArticleLinks = {
  origin_link: string;
  naver_link: string | null;
};

/** 기사 읽기에 사용할 URL (네이버 링크 우선) */
export function getArticleReadUrl(item: ArticleLinks): string {
  return item.naver_link?.trim() || item.origin_link;
}

/** Google News 링크 여부 (iframe·이미지 처리 공통) */
export { isGoogleNewsArticleUrl };

/** 새 탭에서 기사 열기 */
export function openArticleInNewTab(url: string): void {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * iframe으로 삽입할 수 없는 URL인지 판별합니다.
 * - Google News RSS 링크(news.google.com)는 X-Frame-Options로 iframe이 거부됩니다.
 */
export function shouldOpenRelatedNewsInNewTab(url: string): boolean {
  if (isGoogleNewsArticleUrl(url)) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.endsWith("google.com") && parsed.pathname.includes("/rss/articles")) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** 네이버 뉴스 링크는 모달 iframe에 넣었을 때 비교적 잘 동작합니다. */
export function isNaverNewsEmbedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "n.news.naver.com" || host === "news.naver.com";
  } catch {
    return false;
  }
}

/**
 * 모달 iframe으로 기사를 볼 수 있는지.
 * - Google News·대부분 언론사 원문은 iframe 차단 → 새 탭만 사용
 */
export function canEmbedRelatedNewsInIframe(item: ArticleLinks): boolean {
  const readUrl = getArticleReadUrl(item);
  if (shouldOpenRelatedNewsInNewTab(readUrl)) return false;
  return isNaverNewsEmbedUrl(readUrl);
}

/** URL을 모달 iframe에 넣을 수 있는지 (단일 URL 기준) */
export function canEmbedUrlInIframe(url: string): boolean {
  if (shouldOpenRelatedNewsInNewTab(url)) return false;
  return isNaverNewsEmbedUrl(url);
}
