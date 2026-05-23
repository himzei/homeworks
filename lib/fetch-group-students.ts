import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 특정 기수(group_name)의 학생 이름 목록을 가입 순서대로 반환.
 * - 관리자(role === "admin") 제외
 * - 이름이 비어있는 프로필은 제외
 * - 동일 이름은 입력되어도 그대로 반환 (호출 측에서 처리)
 */
export async function fetchGroupStudentNames(
  supabase: SupabaseClient,
  groupName: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("group_name", groupName)
    .neq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("기수 학생 조회 오류:", error);
    return [];
  }
  if (!data) return [];

  return data
    .map((profile) => (profile.name ?? "").trim())
    .filter((name): name is string => name.length > 0);
}
