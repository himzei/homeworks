/**
 * 관련뉴스 전체 수집 (네이버 API + Google News RSS) → Supabase upsert
 * 실행: node scripts/sync-related-news.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const RELATED_NEWS_KEYWORDS = {
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

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) =>
      String.fromCodePoint(Number.parseInt(num, 10)),
    );
}

function stripHtml(text) {
  if (!text) return "";
  let decoded = decodeHtmlEntities(text);
  decoded = decoded.replace(/<[^>]*>/g, " ");
  decoded = decodeHtmlEntities(decoded);
  return decoded.replace(/\s+/g, " ").trim();
}

function normalizeNewsDescription(description, title) {
  const plain = stripHtml(description ?? "");
  if (!plain) return null;
  if (/href\s*=/i.test(plain) || /target\s*=/i.test(plain)) return null;
  if (/^https?:\/\//i.test(plain)) return null;
  const plainTitle = title ? stripHtml(title) : "";
  if (plainTitle && plain === plainTitle) return null;
  return plain;
}

function stripCdata(text) {
  return text.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function safeToIso(pubDate) {
  if (!pubDate) return null;
  const time = Date.parse(pubDate);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; HimzeiNewsBot/1.0; +https://himzei.com)";

function resolveImageUrl(imageUrl, baseUrl) {
  try {
    if (imageUrl.startsWith("//")) return `https:${imageUrl}`;
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return null;
  }
}

const IMAGE_EXTENSION_PATTERN =
  /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;

/** og:image가 폴더 URL인 경우(예: jndn.com) 제외 */
function isLikelyImageFileUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname;
    if (host.endsWith("googleusercontent.com")) return true;
    if (!path || path === "/" || path.endsWith("/")) return false;
    if (IMAGE_EXTENSION_PATTERN.test(path)) return true;
    if (/\/(image|images|img|thumb|thumbnail|photo|photos|news)\//i.test(path)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function extractOgImageFromHtml(html, baseUrl) {
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

async function fetchArticleImageUrl(pageUrl, fallbackUrl) {
  const isGoogleNews =
    pageUrl.includes("news.google.com") && pageUrl.includes("/rss/articles/");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": isGoogleNews
          ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          : USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        ...(isGoogleNews ? { "Accept-Language": "ko-KR,ko;q=0.9" } : {}),
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const html = await response.text();
    const image = extractOgImageFromHtml(html, response.url || pageUrl);
    if (image) return image;
  } catch {
    // 무시
  } finally {
    clearTimeout(timer);
  }

  if (fallbackUrl && fallbackUrl !== pageUrl) {
    return fetchArticleImageUrl(fallbackUrl, null);
  }
  return null;
}

async function enrichRowsWithImages(rows, concurrency = 6) {
  const result = new Array(rows.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= rows.length) break;

      const row = rows[index];
      if (row.image_url) {
        result[index] = row;
        continue;
      }

      const imageUrl = await fetchArticleImageUrl(row.origin_link, row.naver_link);
      result[index] = { ...row, image_url: imageUrl };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
  );
  return result;
}

async function fetchNaverNewsByQuery(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다.");
  }

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "50");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "date");

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`네이버 API 실패 (${response.status}): ${bodyText}`);
  }

  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

function normalizeNaverItems(category, query, items) {
  const rows = [];
  for (const item of items) {
    const origin = (item.originallink || "").trim();
    const naver = (item.link || "").trim();
    const title = stripHtml(item.title || "");
    if (!origin || !title) continue;
    rows.push({
      category,
      query,
      title,
      description: normalizeNewsDescription(item.description || "", title),
      origin_link: origin,
      naver_link: naver || null,
      published_at: safeToIso(item.pubDate || ""),
      image_url: null,
    });
  }
  return rows;
}

function parseGoogleNewsRss(xmlText) {
  if (!xmlText) return [];
  const items = [];
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of itemBlocks) {
    const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
    const description = (block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const mediaContent =
      block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1] ??
      block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1] ??
      "";
    const cleanTitle = stripHtml(stripCdata(title));
    const cleanLink = stripCdata(link).trim();
    if (!cleanTitle || !cleanLink) continue;
    items.push({
      title: cleanTitle,
      link: cleanLink,
      description:
        normalizeNewsDescription(stripCdata(description), cleanTitle) ?? "",
      pubDate,
      imageUrl: stripCdata(mediaContent).trim() || null,
    });
  }
  return items;
}

async function fetchGoogleNewsRssByQuery(query) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "KR");
  url.searchParams.set("ceid", "KR:ko");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google RSS 실패 (${response.status})`);
  }

  const xmlText = await response.text();
  return parseGoogleNewsRss(xmlText).slice(0, 50).map((item) => ({
    title: item.title,
    description: normalizeNewsDescription(item.description, item.title),
    origin_link: item.link,
    published_at: safeToIso(item.pubDate),
    image_url: item.imageUrl,
  }));
}

function uniqByOriginLink(rows) {
  const byLink = new Map();
  for (const row of rows) {
    const key = `${row.category}::${row.origin_link}`;
    if (!byLink.has(key)) byLink.set(key, row);
  }
  return Array.from(byLink.values());
}

// lib/related-news/sl-news-filter.ts 와 동일 규칙 유지
const SL_UNRELATED_PATTERNS = [
  /sl\s*모터스/i,
  /에스엘\s*모터스/i,
  /sl모터스/i,
  /에스엘모터스/i,
  /sl\s*공사/i,
  /에스엘\s*공사/i,
  /sl공사/i,
  /에스엘공사/i,
  /sl\s*건설/i,
  /에스엘\s*건설/i,
  /sl모터스포츠/i,
  /에스엘모터스포츠/i,
  /금호\s*sl\s*모터/i,
  /오네\s*슈퍼레이스/i,
  /프린터\s*sl/i,
  /sl\s*프린터/i,
  /프린터\s*에스엘/i,
  /에스엘\s*프린터/i,
  /printer\s*sl/i,
  /sl\s*printer/i,
  /sl\s*프레임/i,
  /프레임\s*sl/i,
  /에스엘\s*프레임/i,
  /프레임\s*에스엘/i,
  /sl\s*frame/i,
  /frame\s*sl/i,
  /에스엘\s*플랫폼/i,
  /에스엘플랫폼/i,
  /sl\s*플랫폼/i,
  /sl\s*platform/i,
  /비에스엘/i,
  /\bBSL\b/,
];

const SL_SLP_PATTERNS = [
  /\bSLP\b/,
  /(?:^|[\s,[(「『"])SLP(?:[\s,.)」』"]|$)/,
  /에스엘피(?:\s|$|[.,·])/,
  /SLP\s*(홀딩스|그룹|주가|코스닥|코스피)/i,
];

function stripUrls(text) {
  return text.replace(/https?:\/\/\S+/gi, " ");
}

function isUnrelatedSlNews(row) {
  const haystack = `${row.title}\n${row.description ? stripUrls(row.description) : ""}`;
  if (SL_UNRELATED_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return true;
  }
  return SL_SLP_PATTERNS.some((pattern) => pattern.test(haystack));
}

function filterRelatedNewsRows(rows) {
  return rows.filter((row) => {
    if (row.category !== "sl") return true;
    return !isUnrelatedSlNews(row);
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function mergeExistingImageUrls(category, rows) {
  const originLinks = rows.map((row) => row.origin_link);
  if (originLinks.length === 0) return rows;

  const { data: existingRows } = await supabase
    .from("related_news")
    .select("origin_link, image_url")
    .eq("category", category)
    .in("origin_link", originLinks);

  const imageByLink = new Map(
    (existingRows ?? []).map((row) => [row.origin_link, row.image_url]),
  );

  return rows.map((row) => ({
    ...row,
    image_url: row.image_url ?? imageByLink.get(row.origin_link) ?? null,
  }));
}

const categories = ["sl", "thn", "ajin"];
const stats = [];

console.log("관련뉴스 수집 시작…\n");

for (const category of categories) {
  const keywords = RELATED_NEWS_KEYWORDS[category]?.queries ?? [];
  const fetchedRows = [];

  for (const query of keywords) {
    process.stdout.write(`  [${category}] "${query}" … `);
    try {
      const [naverItems, googleItems] = await Promise.all([
        fetchNaverNewsByQuery(query),
        fetchGoogleNewsRssByQuery(query),
      ]);

      const naverRows = normalizeNaverItems(category, query, naverItems);
      const googleRows = googleItems.map((row) => ({
        category,
        query,
        title: row.title,
        description: row.description,
        origin_link: row.origin_link,
        naver_link: null,
        published_at: row.published_at,
        image_url: row.image_url,
      }));

      fetchedRows.push(...naverRows, ...googleRows);
      console.log(`네이버 ${naverRows.length} + 구글 ${googleRows.length}`);
    } catch (err) {
      console.log(`오류: ${err instanceof Error ? err.message : err}`);
    }

    // API rate limit 완화
    await new Promise((r) => setTimeout(r, 300));
  }

  const uniqueRows = uniqByOriginLink(fetchedRows);
  const filteredRows = filterRelatedNewsRows(uniqueRows);

  console.log(`\n[${category}] 썸네일 추출 중… (${filteredRows.length}건)`);
  const enrichedRows = await enrichRowsWithImages(filteredRows, 6);
  const rowsToUpsert = await mergeExistingImageUrls(category, enrichedRows);
  const withImageCount = rowsToUpsert.filter((row) => row.image_url).length;
  console.log(`[${category}] 썸네일 확보: ${withImageCount}/${rowsToUpsert.length}건`);

  if (rowsToUpsert.length === 0) {
    stats.push({ category, fetched: 0, upserted: 0 });
    console.log(`\n[${category}] 저장할 항목 없음\n`);
    continue;
  }

  const { error: upsertError } = await supabase
    .from("related_news")
    .upsert(rowsToUpsert, { onConflict: "category,origin_link" });

  if (upsertError) {
    console.error(`\n[${category}] DB upsert 실패:`, upsertError.message);
    console.error(
      "  → supabase migration이 적용되었는지 확인: npm run supabase:push",
    );
    process.exit(1);
  }

  stats.push({
    category,
    queries: keywords.length,
    fetched: fetchedRows.length,
    uniqueByLink: rowsToUpsert.length,
    upserted: rowsToUpsert.length,
    withImage: withImageCount,
  });

  console.log(
    `\n[${category}] 완료 — 수집 ${fetchedRows.length}건, 저장 ${rowsToUpsert.length}건 (썸네일 ${withImageCount}건)\n`,
  );
}

console.log("=== 전체 수집 결과 ===");
console.table(stats);
console.log("완료.");
