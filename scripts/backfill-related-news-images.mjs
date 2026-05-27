/**
 * 기존 related_news 행에 썸네일(image_url)만 채웁니다.
 * 실행: node scripts/backfill-related-news-images.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categories = ["sl", "thn", "ajin"];
const perCategoryLimit = 80;

console.log("관련뉴스 썸네일 백필 시작…\n");

for (const category of categories) {
  const { data: rows, error } = await supabase
    .from("related_news")
    .select("id, origin_link, naver_link, image_url")
    .eq("category", category)
    .is("image_url", null)
    .order("published_at", { ascending: false })
    .limit(perCategoryLimit);

  if (error) {
    console.error(`[${category}] 조회 실패:`, error.message);
    if (error.message.includes("image_url")) {
      console.error("  → migration 적용: npm run supabase:push");
    }
    continue;
  }

  if (!rows?.length) {
    console.log(`[${category}] 썸네일 없는 항목 없음 (또는 이미 채워짐)`);
    continue;
  }

  let updated = 0;
  console.log(`[${category}] ${rows.length}건 처리 중…`);

  let nextIndex = 0;
  const concurrency = 6;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= rows.length) break;

      const row = rows[index];
      const imageUrl = await fetchArticleImageUrl(row.origin_link, row.naver_link);
      if (!imageUrl) continue;

      const { error: updateError } = await supabase
        .from("related_news")
        .update({ image_url: imageUrl })
        .eq("id", row.id);

      if (!updateError) updated += 1;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
  );

  console.log(`[${category}] 썸네일 저장 ${updated}/${rows.length}건\n`);
}

console.log("백필 완료.");
