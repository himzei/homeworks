import {
  isGenericGoogleNewsOgImage,
  isGoogleNewsArticleUrl,
  resolveGoogleNewsPublisherUrl,
} from "@/lib/related-news/google-news-url";

const DEFAULT_TIMEOUT_MS = 8000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; HimzeiNewsBot/1.0; +https://himzei.com)";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * 기사 페이지 HTML에서 og:image / twitter:image 메타 태그를 추출합니다.
 */
function extractOgImageFromHtml(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  const snippets = [html.slice(0, 180_000)];
  if (html.length > 180_000) {
    snippets.push(html.slice(Math.max(0, html.length - 150_000)));
  }

  for (const snippet of snippets) {
    for (const pattern of patterns) {
      const match = snippet.match(pattern);
      if (match?.[1]) {
        const resolved = resolveImageUrl(match[1].trim(), baseUrl);
        if (resolved && isLikelyImageFileUrl(resolved)) return resolved;
      }
    }
  }

  return null;
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string | null {
  try {
    if (imageUrl.startsWith("//")) return `https:${imageUrl}`;
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return null;
  }
}

const IMAGE_EXTENSION_PATTERN =
  /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;

/**
 * og:image 값이 실제 이미지 파일 URL인지 검사합니다.
 */
export function isLikelyImageFileUrl(url: string): boolean {
  if (!url || isGenericGoogleNewsOgImage(url)) return false;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname;

    // Google News 공통 로고(googleusercontent)는 제외 — 위 isGenericGoogleNewsOgImage에서 처리

    if (!path || path === "/" || path.endsWith("/")) return false;

    if (IMAGE_EXTENSION_PATTERN.test(path)) return true;

    if (/\/(image|images|img|thumb|thumbnail|photo|photos|news)\//i.test(path)) {
      return true;
    }

    // 확장자 없는 CDN 이미지 (googleusercontent 중 기사별 프록시 등)
    if (host.endsWith("googleusercontent.com")) return true;

    return false;
  } catch {
    return false;
  }
}

async function tryFetchOgImage(
  pageUrl: string,
  timeoutMs: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isGoogleNews = isGoogleNewsArticleUrl(pageUrl);

  try {
    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": isGoogleNews ? BROWSER_USER_AGENT : USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        ...(isGoogleNews ? { "Accept-Language": "ko-KR,ko;q=0.9" } : {}),
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const imageUrl = extractOgImageFromHtml(html, response.url || pageUrl);
    if (imageUrl && isGenericGoogleNewsOgImage(imageUrl)) return null;
    return imageUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Google News URL → 언론사 원문에서 og:image 추출
 */
async function fetchGoogleNewsArticleImage(
  googleNewsUrl: string,
  timeoutMs: number,
): Promise<string | null> {
  const publisherUrl = await resolveGoogleNewsPublisherUrl(googleNewsUrl, {
    timeoutMs,
  });
  if (!publisherUrl) return null;

  return tryFetchOgImage(publisherUrl, timeoutMs);
}

/**
 * 기사 URL(및 선택적 fallback)에서 대표 이미지 URL을 가져옵니다.
 */
export async function fetchArticleImageUrl(
  pageUrl: string,
  options?: {
    fallbackUrl?: string | null;
    timeoutMs?: number;
  },
): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (isGoogleNewsArticleUrl(pageUrl)) {
    const fromPublisher = await fetchGoogleNewsArticleImage(pageUrl, timeoutMs);
    if (fromPublisher) return fromPublisher;

    const fallback = options?.fallbackUrl?.trim();
    if (fallback && !isGoogleNewsArticleUrl(fallback)) {
      return tryFetchOgImage(fallback, timeoutMs);
    }

    return null;
  }

  const primary = await tryFetchOgImage(pageUrl, timeoutMs);
  if (primary) return primary;

  const fallback = options?.fallbackUrl?.trim();
  if (fallback && fallback !== pageUrl && !isGoogleNewsArticleUrl(fallback)) {
    return tryFetchOgImage(fallback, timeoutMs);
  }

  return null;
}
