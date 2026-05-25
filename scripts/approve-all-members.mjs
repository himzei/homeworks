/**
 * 기존 회원 전원 approval_status = approved 일괄 처리
 * 실행: node --env-file=.env.local scripts/approve-all-members.mjs
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다 (.env.local 확인)",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: beforeRows, error: countError } = await supabase
  .from("profiles")
  .select("id, approval_status")
  .neq("approval_status", "approved");

if (countError) {
  console.error("조회 실패:", countError.message);
  process.exit(1);
}

const pendingCount = (beforeRows ?? []).length;
console.log(`승인 대기·미승인 프로필: ${pendingCount}건`);

if (pendingCount === 0) {
  console.log("이미 전원 승인 상태입니다.");
  process.exit(0);
}

const { error: updateError } = await supabase
  .from("profiles")
  .update({ approval_status: "approved" })
  .neq("approval_status", "approved");

if (updateError) {
  console.error("일괄 승인 실패:", updateError.message);
  process.exit(1);
}

const { count, error: verifyError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .neq("approval_status", "approved");

if (verifyError) {
  console.error("검증 조회 실패:", verifyError.message);
  process.exit(1);
}

console.log(`완료: ${pendingCount}건 승인 처리됨 (미승인 잔여: ${count ?? 0}건)`);
