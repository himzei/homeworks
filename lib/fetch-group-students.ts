import type { SupabaseClient } from "@supabase/supabase-js";

import { LEGACY_GROUPS } from "@/lib/constants";
import { PROFILE_APPROVAL_STATUS } from "@/lib/profile-approval";

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
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
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

/** 자리배치도용 학생 (id + 이름 + 프로필 이미지) */
export type SeatingStudent = {
  id: string;
  name: string;
  avatar_url: string | null;
};

/**
 * 자리배치도용 기수 학생 목록 (이름 가나다순, id 포함)
 * - LEGACY 기수(13기)는 group_name null 학생도 포함
 */
export async function fetchSeatingStudents(
  supabase: SupabaseClient,
  groupName: string,
): Promise<SeatingStudent[]> {
  let query = supabase
    .from("profiles")
    .select("id, name, avatar_url, role")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
    .order("name", { ascending: true });

  if (LEGACY_GROUPS.includes(groupName as (typeof LEGACY_GROUPS)[number])) {
    const escaped = groupName.replace(/"/g, '""');
    query = query.or(`group_name.eq."${escaped}",group_name.is.null`);
  } else {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("자리배치도 학생 목록 조회 오류:", error);
    return [];
  }
  if (!data) return [];

  return data.flatMap((profile) => {
    const name = (profile.name ?? "").trim();
    if (!name) return [];
    return [
      {
        id: profile.id,
        name,
        avatar_url: profile.avatar_url ?? null,
      },
    ];
  });
}

/**
 * 자리배치도용 기수 학생 명단 (이름 가나다순)
 * - LEGACY 기수(13기)는 group_name null 학생도 포함
 */
export async function fetchSeatingStudentNames(
  supabase: SupabaseClient,
  groupName: string,
): Promise<string[]> {
  const students = await fetchSeatingStudents(supabase, groupName);
  return students.map((student) => student.name);
}

/** 배정된 이름으로 프로필 id 조회 (기수 미지정 차트용) */
export async function fetchProfileIdsByNames(
  supabase: SupabaseClient,
  names: string[],
): Promise<SeatingStudent[]> {
  const uniqueNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, role")
    .neq("role", "admin")
    .eq("approval_status", PROFILE_APPROVAL_STATUS.approved)
    .in("name", uniqueNames);

  if (error) {
    console.error("이름별 프로필 조회 오류:", error);
    return [];
  }
  if (!data) return [];

  return data.flatMap((profile) => {
    const name = (profile.name ?? "").trim();
    if (!name) return [];
    return [
      {
        id: profile.id,
        name,
        avatar_url: profile.avatar_url ?? null,
      },
    ];
  });
}
