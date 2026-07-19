import type { SupabaseClient } from "@supabase/supabase-js";

/** 과정명(name) 변경 시 group_name을 참조하는 테이블 일괄 갱신 */
const GROUP_NAME_REFERENCE_TABLES = [
  "profiles",
  "assignments",
  "surveys",
  "evaluation_extra_fields",
  "seating_charts",
  "class_role_snapshots",
  "honor_badge_sections",
  "honor_badges",
  "student_final_evaluations",
  "peer_evaluation_projects",
  "company_inquiry_posts",
] as const;

export async function syncTrainingCourseGroupName(
  supabase: SupabaseClient,
  oldCourseName: string,
  newCourseName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedOldName = oldCourseName.trim();
  const trimmedNewName = newCourseName.trim();

  if (!trimmedOldName || trimmedOldName === trimmedNewName) {
    return { ok: true };
  }

  for (const tableName of GROUP_NAME_REFERENCE_TABLES) {
    const { error } = await supabase
      .from(tableName)
      .update({ group_name: trimmedNewName })
      .eq("group_name", trimmedOldName);

    if (error) {
      console.error(`과정명 연동 갱신 실패 (${tableName}):`, error);
      return {
        ok: false,
        error: `연관 데이터(${tableName}) 갱신에 실패했습니다.`,
      };
    }
  }

  return { ok: true };
}
