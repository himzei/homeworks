/**
 * SL 관련뉴스 중 SL모터스·SL공사 등 무관 기사 삭제
 * 실행: node scripts/cleanup-sl-unrelated-news.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 500;

async function fetchAllSlNews() {
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("related_news")
      .select("id, title, description")
      .eq("category", "sl")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data?.length) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

async function main() {
  console.log("SL 무관 뉴스 정리 시작…\n");

  const rows = await fetchAllSlNews();
  const toDelete = rows.filter(isUnrelatedSlNews);

  console.log(`SL 전체 ${rows.length}건 중 삭제 대상 ${toDelete.length}건`);

  if (toDelete.length === 0) {
    console.log("삭제할 항목이 없습니다.");
    return;
  }

  for (const row of toDelete.slice(0, 10)) {
    console.log(`  - ${row.title}`);
  }
  if (toDelete.length > 10) {
    console.log(`  … 외 ${toDelete.length - 10}건`);
  }

  const ids = toDelete.map((row) => row.id);
  const BATCH = 100;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batchIds = ids.slice(i, i + BATCH);
    const { error } = await supabase.from("related_news").delete().in("id", batchIds);
    if (error) {
      console.error("삭제 실패:", error.message);
      process.exit(1);
    }
  }

  console.log(`\n완료: ${toDelete.length}건 삭제했습니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
