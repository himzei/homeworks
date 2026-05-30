import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export type StudentCountsByGroup = Record<string, number>;

/** RPC 결과를 탭 배지용 Record로 변환 */
function parseStudentCountsRpcResult(raw: unknown): StudentCountsByGroup {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { all: 0 };
  }

  const parsed: StudentCountsByGroup = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const count = typeof value === "number" ? value : Number(value);
    parsed[key] = Number.isFinite(count) ? count : 0;
  }

  if (parsed.all === undefined) {
    parsed.all = 0;
  }

  return parsed;
}

/** RPC 미적용 DB용 — profiles에서 동일 규칙으로 집계 */
async function fetchStudentCountsByGroupFallback(
  supabase: SupabaseClient,
): Promise<StudentCountsByGroup> {
  const { data, error } = await supabase
    .from("profiles")
    .select("group_name")
    .neq("role", "admin")
    .eq("is_dormant", false);

  if (error) {
    console.error("기수별 학생 수 fallback 조회 오류:", error);
    return { all: 0 };
  }

  const profiles = data ?? [];
  const unsetGroupCount = profiles.filter((profile) => !profile.group_name).length;
  const counts: StudentCountsByGroup = { all: profiles.length };

  for (const profile of profiles) {
    const groupKey = profile.group_name;
    if (groupKey) {
      counts[groupKey] = (counts[groupKey] ?? 0) + 1;
    }
  }

  for (const key of Object.keys(counts)) {
    if (key !== "all") {
      counts[key] += unsetGroupCount;
    }
  }

  return counts;
}

/**
 * DB RPC로 기수별 학생 수 조회 (전체 profiles 스캔 없음)
 * - RPC가 없으면(PGRST202) fallback 후 `supabase db push` 안내
 */
export async function fetchStudentCountsByGroup(
  supabase: SupabaseClient,
): Promise<StudentCountsByGroup> {
  const { data, error } = await supabase.rpc("get_student_counts_by_group");

  if (error) {
    if (error.code === "PGRST202") {
      console.warn(
        "[admin] get_student_counts_by_group RPC가 없습니다. profiles fallback을 사용합니다. 마이그레이션 적용: npm run supabase:push",
      );
      return fetchStudentCountsByGroupFallback(supabase);
    }

    console.error("기수별 학생 수 RPC 오류:", error);
    return fetchStudentCountsByGroupFallback(supabase);
  }

  return parseStudentCountsRpcResult(data);
}

/**
 * 요청당 1회만 집계 (layout·GroupTabsLoader·페이지에서 공유)
 */
export const getCachedStudentCountsByGroup = cache(
  async (): Promise<StudentCountsByGroup> => {
    const supabase = await createClient();
    return fetchStudentCountsByGroup(supabase);
  },
);
