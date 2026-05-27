/**
 * Google News 기사 썸네일 재수집 (언론사 원문 og:image)
 * - 공통 Google 로고 image_url 제거·교체
 * 실행: node scripts/fix-google-news-images.mjs
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

const PLACEHOLDER_MARK =
  "J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrp";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isGoogleNewsUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.replace(/^www\./, "") === "news.google.com" &&
      u.pathname.includes("/rss/articles/")
    );
  } catch {
    return false;
  }
}

function extractArticleId(url) {
  try {
    return new URL(url).pathname.split("/").pop().split("?")[0];
  } catch {
    return null;
  }
}

async function resolvePublisherUrl(googleNewsUrl) {
  const articleId = extractArticleId(googleNewsUrl);
  if (!articleId) return null;

  const pageRes = await fetch(googleNewsUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    redirect: "follow",
  });
  if (!pageRes.ok) return null;

  const html = await pageRes.text();
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = Number(html.match(/data-n-a-ts="([^"]+)"/)?.[1]);
  if (!signature || !Number.isFinite(timestamp)) return null;

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

  const batchRes = await fetch(
    "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: "https://news.google.com/",
        "User-Agent": BROWSER_UA,
      },
      body: `f.req=${encodeURIComponent(payload)}`,
    },
  );

  if (!batchRes.ok) return null;
  const text = await batchRes.text();
  const m =
    text.match(/\\"garturlres\\",\\"(https?:[^\\]+)/) ||
    text.match(/"garturlres","(https?:[^"]+)"/);
  return m?.[1] ?? null;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;

function isValidImage(url) {
  if (!url || url.includes(PLACEHOLDER_MARK)) return false;
  try {
    const { hostname, pathname } = new URL(url);
    if (!pathname || pathname === "/" || pathname.endsWith("/")) return false;
    if (IMAGE_EXT.test(pathname)) return true;
    if (/\/(image|images|img|thumb|thumbnail|photo|photos|news)\//i.test(pathname)) {
      return true;
    }
    if (hostname.endsWith("googleusercontent.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function extractOgImage(html, baseUrl) {
  const snippets = [html.slice(0, 180_000)];
  if (html.length > 180_000) snippets.push(html.slice(-150_000));
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const snippet of snippets) {
    for (const pattern of patterns) {
      const match = snippet.match(pattern);
      if (match?.[1]) {
        try {
          const resolved = new URL(match[1].trim(), baseUrl).href;
          if (isValidImage(resolved)) return resolved;
        } catch {
          /* skip */
        }
      }
    }
  }
  return null;
}

async function fetchArticleImage(originLink, naverLink) {
  if (isGoogleNewsUrl(originLink)) {
    const publisher = await resolvePublisherUrl(originLink);
    if (publisher) {
      const res = await fetch(publisher, {
        headers: { "User-Agent": BROWSER_UA },
        redirect: "follow",
      });
      if (res.ok) {
        const img = extractOgImage(await res.text(), res.url || publisher);
        if (img) return img;
      }
    }
    if (naverLink && !isGoogleNewsUrl(naverLink)) {
      const res = await fetch(naverLink, { headers: { "User-Agent": BROWSER_UA } });
      if (res.ok) return extractOgImage(await res.text(), res.url || naverLink);
    }
    return null;
  }

  const res = await fetch(originLink, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) return null;
  return extractOgImage(await res.text(), res.url || originLink);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE = 500;
let from = 0;
const targets = [];

while (true) {
  const { data, error } = await supabase
    .from("related_news")
    .select("id, title, origin_link, naver_link, image_url")
    .or(
      `origin_link.ilike.%news.google.com%,image_url.ilike.%${PLACEHOLDER_MARK}%`,
    )
    .range(from, from + PAGE - 1);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) break;
  targets.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}

const toFix = targets.filter(
  (row) =>
    isGoogleNewsUrl(row.origin_link) ||
    (row.image_url && row.image_url.includes(PLACEHOLDER_MARK)),
);

console.log(`Google News / 공통 로고 썸네일 대상: ${toFix.length}건\n`);

let updated = 0;
let cleared = 0;

for (let i = 0; i < toFix.length; i++) {
  const row = toFix[i];
  process.stdout.write(`[${i + 1}/${toFix.length}] ${row.title.slice(0, 40)}… `);

  try {
    const imageUrl = await fetchArticleImage(row.origin_link, row.naver_link);
    const { error } = await supabase
      .from("related_news")
      .update({ image_url: imageUrl })
      .eq("id", row.id);

    if (error) {
      console.log(`DB 오류: ${error.message}`);
      continue;
    }

    if (imageUrl) {
      updated += 1;
      console.log("OK");
    } else {
      cleared += 1;
      console.log("썸네일 없음(플레이스홀더 제거)");
    }
  } catch (err) {
    console.log(`오류: ${err instanceof Error ? err.message : err}`);
  }

  await new Promise((r) => setTimeout(r, 400));
}

console.log(`\n완료 — 썸네일 저장 ${updated}건, 제거 ${cleared}건`);
