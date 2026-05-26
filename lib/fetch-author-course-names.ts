import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 작성자 user id → 과정명(group_name) 맵 조회
 */
export async function fetchAuthorCourseNameByUserId(
  supabase: SupabaseClient,
  authorUserIds: Array<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const uniqueIds = [
    ...new Set(
      authorUserIds.filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, group_name")
    .in("id", uniqueIds);

  if (error) {
    console.error("작성자 과정명 조회 오류:", error);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => {
      const profile = row as { id: string; group_name: string | null };
      const courseName = profile.group_name?.trim() || null;
      return [profile.id, courseName] as const;
    }),
  );
}
