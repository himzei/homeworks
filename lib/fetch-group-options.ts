import type { SupabaseClient } from "@supabase/supabase-js";

import { GROUP_OPTIONS } from "@/lib/constants";

/** 과정 선택 드롭다운 옵션 */
export type GroupOption = {
  value: string;
  label: string;
};

const EMPTY_GROUP_OPTION: GroupOption = { value: "", label: "선택하세요" };

/** UI 표시용 짧은 과정명 (예: "15기 교육생 - …" → "15기") */
export function formatShortGroupLabel(groupName: string | null | undefined): string {
  if (!groupName?.trim()) return "미지정";
  const match = groupName.match(/^(\d+기)/);
  return match ? match[1] : groupName;
}

/** 기수 번호 추출 — 정렬용 (예: "16기 교육생 - …" → 16) */
export function parseCohortNumberFromGroupName(name: string): number | null {
  const match = name.match(/(\d+)기/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** admin 탭 등 — 기수 내림차순 (16기 → 15기 → 14기 …) */
export function sortGroupOptionsByCohortDesc(
  options: GroupOption[],
): GroupOption[] {
  return [...options].toSorted((optionA, optionB) => {
    const labelA = optionA.label || optionA.value;
    const labelB = optionB.label || optionB.value;
    const cohortA = parseCohortNumberFromGroupName(labelA);
    const cohortB = parseCohortNumberFromGroupName(labelB);

    if (cohortA !== null && cohortB !== null && cohortB !== cohortA) {
      return cohortB - cohortA;
    }
    if (cohortA !== null && cohortB === null) return -1;
    if (cohortA === null && cohortB !== null) return 1;

    return labelA.localeCompare(labelB, "ko");
  });
}

/** DB 미적용·조회 실패 시 constants 기반 폴백 */
function getStaticGroupOptions(): GroupOption[] {
  const courseOptions = sortGroupOptionsByCohortDesc(
    GROUP_OPTIONS.filter((opt) => opt.value).map((opt) => ({
      value: opt.value,
      label: opt.label,
    })),
  );

  return [EMPTY_GROUP_OPTION, ...courseOptions];
}

/**
 * 활성 과정 목록을 선택 옵션으로 반환한다.
 * training_courses 테이블이 없으면 lib/constants 폴백.
 */
export async function fetchGroupOptions(
  supabase: SupabaseClient,
): Promise<GroupOption[]> {
  const { data, error } = await supabase
    .from("training_courses")
    .select("name")
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("과정 옵션 조회 오류:", error);
    return getStaticGroupOptions();
  }

  if (!data?.length) {
    return getStaticGroupOptions();
  }

  return [
    EMPTY_GROUP_OPTION,
    ...sortGroupOptionsByCohortDesc(
      data.map((row) => ({
        value: row.name,
        label: row.name,
      })),
    ),
  ];
}

/**
 * 프로필 수정용 — 레거시(13기 등) 과정 제외
 */
export async function fetchProfileGroupOptions(
  supabase: SupabaseClient,
): Promise<GroupOption[]> {
  const { data, error } = await supabase
    .from("training_courses")
    .select("name, is_legacy")
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return getStaticGroupOptions().filter(
      (opt) =>
        !opt.value || !opt.value.startsWith("13기 교육생 -"),
    );
  }

  return [
    EMPTY_GROUP_OPTION,
    ...sortGroupOptionsByCohortDesc(
      data
        .filter((row) => !row.is_legacy)
        .map((row) => ({
          value: row.name,
          label: row.name,
        })),
    ),
  ];
}

/**
 * 레거시 과정명 목록 (과제/설문 group_name null 포함 조회용)
 */
export async function fetchLegacyGroupNames(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("training_courses")
    .select("name")
    .eq("is_legacy", true)
    .eq("is_active", true);

  if (error || !data?.length) {
    const { LEGACY_GROUPS } = await import("@/lib/constants");
    return [...LEGACY_GROUPS];
  }

  return data.map((row) => row.name);
}
