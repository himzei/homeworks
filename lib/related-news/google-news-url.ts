const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT_MS = 6000;

/** Google News 기사 페이지 공통 og:image(로고) — 기사별 썸네일이 아님 */
export const GOOGLE_NEWS_PLACEHOLDER_OG_IMAGE_MARK =
  "J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrp";

export function isGoogleNewsArticleUrl(pageUrl: string): boolean {
  try {
    const parsed = new URL(pageUrl);
    return (
      parsed.hostname.replace(/^www\./, "") === "news.google.com" &&
      parsed.pathname.includes("/rss/articles/")
    );
  } catch {
    return false;
  }
}

export function isGenericGoogleNewsOgImage(url: string): boolean {
  return url.includes(GOOGLE_NEWS_PLACEHOLDER_OG_IMAGE_MARK);
}

function extractGoogleNewsArticleId(googleNewsUrl: string): string | null {
  try {
    const segment = new URL(googleNewsUrl).pathname.split("/").pop();
    return segment?.split("?")[0] || null;
  } catch {
    return null;
  }
}

function extractPageDecodeParams(html: string): {
  articleId: string | null;
  signature: string | null;
  timestamp: number | null;
} {
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1] ?? null;
  const timestampRaw = html.match(/data-n-a-ts="([^"]+)"/)?.[1] ?? null;
  const timestamp = timestampRaw ? Number(timestampRaw) : null;

  // HTML 속 data-n-a-href 등에 기사 ID가 있을 수 있음
  const hrefId =
    html.match(/data-n-a-href="[^"]*\/articles\/([^"?]+)/)?.[1] ?? null;

  return {
    articleId: hrefId,
    signature,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
  };
}

async function fetchPublisherUrlViaBatchExecute(
  articleId: string,
  signature: string,
  timestamp: number,
): Promise<string | null> {
  const garturlreq = [
    "garturlreq",
    [
      [
        "X",
        "X",
        ["X", "X"],
        null,
        null,
        1,
        1,
        "KR:ko",
        null,
        1,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
      ],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    articleId,
    timestamp,
    signature,
  ];

  const payload = JSON.stringify([
    [["Fbv4je", JSON.stringify(garturlreq), null, "generic"]],
  ]);

  const response = await fetch(
    "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: "https://news.google.com/",
        "User-Agent": BROWSER_USER_AGENT,
      },
      body: `f.req=${encodeURIComponent(payload)}`,
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const text = await response.text();
  const patterns = [
    /\\"garturlres\\",\\"(https?:[^\\]+)/,
    /"garturlres","(https?:[^"]+)"/,
    /garturlres\\",\\"(https?:[^\\]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      try {
        const decoded = JSON.parse(`"${match[1]}"`) as string;
        if (decoded.startsWith("http")) return decoded;
      } catch {
        if (match[1].startsWith("http")) return match[1];
      }
    }
  }

  return null;
}

/**
 * Google News RSS 리다이렉트 URL → 언론사 원문 URL
 * - 기사 HTML에서 signature(ts/sg) 추출 후 batchexecute 호출
 */
export async function resolveGoogleNewsPublisherUrl(
  googleNewsUrl: string,
  options?: { timeoutMs?: number },
): Promise<string | null> {
  if (!isGoogleNewsArticleUrl(googleNewsUrl)) return null;

  const articleId = extractGoogleNewsArticleId(googleNewsUrl);
  if (!articleId) return null;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(googleNewsUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();
    const { signature, timestamp } = extractPageDecodeParams(html);
    if (!signature || timestamp === null) return null;

    const resolvedId = extractPageDecodeParams(html).articleId ?? articleId;
    return await fetchPublisherUrlViaBatchExecute(
      resolvedId,
      signature,
      timestamp,
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
