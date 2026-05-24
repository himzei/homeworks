import type { SupabaseClient } from "@supabase/supabase-js";

/** DB honor_badges 행 */
export type HonorBadgeRecord = {
  id: string;
  group_name: string;
  section_id: string | null;
  label: string;
  sort_order: number;
  created_at: string;
};

/** 관리 UI용 배지 + 부여된 학생 id */
export type HonorBadgeWithAssignments = {
  id: string;
  label: string;
  sortOrder: number;
  profileIds: string[];
};

/** 섹션 + 배지 목록 */
export type HonorBadgeSectionWithBadges = {
  id: string;
  title: string;
  sortOrder: number;
  badges: HonorBadgeWithAssignments[];
};

/** 클라이언트·API 공통 저장 payload — 배지 */
export type HonorBadgeSaveItem = {
  /** 기존 UUID 또는 `new-` 접두 임시 id */
  id: string;
  label: string;
  profileIds: string[];
};

/** 섹션 저장 payload */
export type HonorBadgeSectionSaveItem = {
  /** 기존 UUID 또는 `new-section-` 접두 임시 id */
  id: string;
  title: string;
  badges: HonorBadgeSaveItem[];
};

const NEW_BADGE_ID_PREFIX = "new-";
const NEW_SECTION_ID_PREFIX = "new-section-";

export function isNewHonorBadgeId(id: string): boolean {
  return id.startsWith(NEW_BADGE_ID_PREFIX);
}

export function isNewHonorBadgeSectionId(id: string): boolean {
  return id.startsWith(NEW_SECTION_ID_PREFIX);
}

/**
 * 과정별 명예 배지 섹션 + 배지·부여 목록 조회
 */
export async function fetchHonorBadgeSectionsForGroup(
  supabase: SupabaseClient,
  groupName: string,
): Promise<HonorBadgeSectionWithBadges[]> {
  const { data: sections, error: sectionsError } = await supabase
    .from("honor_badge_sections")
    .select("id, title, sort_order")
    .eq("group_name", groupName)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionsError) {
    console.error("명예 배지 섹션 조회:", sectionsError);
    return [];
  }

  if (!sections?.length) return [];

  const sectionIds = sections.map((s) => s.id);

  const { data: badges, error: badgesError } = await supabase
    .from("honor_badges")
    .select("id, label, sort_order, section_id")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (badgesError) {
    console.error("명예 배지 조회:", badgesError);
    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      sortOrder: section.sort_order,
      badges: [],
    }));
  }

  const badgeIds = (badges ?? []).map((b) => b.id);
  const profileIdsByBadgeId = new Map<string, string[]>();

  if (badgeIds.length > 0) {
    const { data: assignments, error: assignError } = await supabase
      .from("profile_honor_badges")
      .select("profile_id, honor_badge_id")
      .in("honor_badge_id", badgeIds);

    if (assignError) {
      console.error("명예 배지 부여 조회:", assignError);
    }

    for (const badgeId of badgeIds) {
      profileIdsByBadgeId.set(badgeId, []);
    }
    for (const row of assignments ?? []) {
      const list = profileIdsByBadgeId.get(row.honor_badge_id) ?? [];
      list.push(row.profile_id);
      profileIdsByBadgeId.set(row.honor_badge_id, list);
    }
  }

  const badgesBySectionId = new Map<string, HonorBadgeWithAssignments[]>();
  for (const sectionId of sectionIds) {
    badgesBySectionId.set(sectionId, []);
  }

  for (const badge of badges ?? []) {
    if (!badge.section_id) continue;
    const list = badgesBySectionId.get(badge.section_id) ?? [];
    list.push({
      id: badge.id,
      label: badge.label,
      sortOrder: badge.sort_order,
      profileIds: profileIdsByBadgeId.get(badge.id) ?? [],
    });
    badgesBySectionId.set(badge.section_id, list);
  }

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    sortOrder: section.sort_order,
    badges: badgesBySectionId.get(section.id) ?? [],
  }));
}

/** @deprecated 섹션 없이 조회 — 마이그레이션 전 호환용 */
export async function fetchHonorBadgesForGroup(
  supabase: SupabaseClient,
  groupName: string,
): Promise<HonorBadgeWithAssignments[]> {
  const sections = await fetchHonorBadgeSectionsForGroup(supabase, groupName);
  return sections.flatMap((s) => s.badges);
}

/**
 * profile_id → 배지 라벨 목록 (표시용, sort_order 순)
 */
export async function fetchHonorBadgeLabelsByProfileId(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Record<string, string[]>> {
  if (profileIds.length === 0) return {};

  const { data, error } = await supabase
    .from("profile_honor_badges")
    .select("profile_id, honor_badges(label, sort_order)")
    .in("profile_id", profileIds);

  if (error) {
    console.error("학생별 명예 배지 조회:", error);
    return {};
  }

  const entriesByProfile = new Map<
    string,
    Array<{ label: string; sortOrder: number }>
  >();

  for (const row of data ?? []) {
    const profileId = row.profile_id as string;
    const badgeRaw = row.honor_badges as
      | { label: string; sort_order: number }
      | { label: string; sort_order: number }[]
      | null;

    const badge = Array.isArray(badgeRaw) ? badgeRaw[0] : badgeRaw;
    if (!badge?.label) continue;

    const list = entriesByProfile.get(profileId) ?? [];
    list.push({ label: badge.label, sortOrder: badge.sort_order ?? 0 });
    entriesByProfile.set(profileId, list);
  }

  const result: Record<string, string[]> = {};
  for (const [profileId, entries] of entriesByProfile) {
    result[profileId] = entries
      .toSorted(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.label.localeCompare(b.label, "ko"),
      )
      .map((e) => e.label);
  }

  return result;
}

type ApplyHonorBadgesResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

async function applyBadgesInSection(
  supabase: SupabaseClient,
  groupName: string,
  sectionId: string,
  items: HonorBadgeSaveItem[],
  validStudentIds: Set<string>,
): Promise<ApplyHonorBadgesResult> {
  const trimmedItems = items
    .map((item, index) => ({
      id: item.id.trim(),
      label: item.label.trim(),
      profileIds: [...new Set(item.profileIds)].filter((id) =>
        validStudentIds.has(id),
      ),
      sortOrder: index,
    }))
    .filter((item) => item.label.length > 0);

  const labels = trimmedItems.map((i) => i.label);
  if (new Set(labels).size !== labels.length) {
    return {
      ok: false,
      error: "같은 섹션 안에 같은 이름의 배지가 중복되었습니다.",
      status: 400,
    };
  }

  const { data: existingBadges, error: fetchError } = await supabase
    .from("honor_badges")
    .select("id")
    .eq("section_id", sectionId);

  if (fetchError) {
    console.error("섹션 내 배지 조회:", fetchError);
    return { ok: false, error: "배지 목록을 불러오지 못했습니다.", status: 500 };
  }

  const existingIds = new Set((existingBadges ?? []).map((b) => b.id));
  const keptIds = new Set<string>();

  for (const item of trimmedItems) {
    if (!isNewHonorBadgeId(item.id) && existingIds.has(item.id)) {
      const { error: updateError } = await supabase
        .from("honor_badges")
        .update({ label: item.label, sort_order: item.sortOrder })
        .eq("id", item.id)
        .eq("section_id", sectionId);

      if (updateError) {
        console.error("명예 배지 수정:", updateError);
        return { ok: false, error: "배지 저장에 실패했습니다.", status: 500 };
      }
      keptIds.add(item.id);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("honor_badges")
        .insert({
          group_name: groupName,
          section_id: sectionId,
          label: item.label,
          sort_order: item.sortOrder,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("명예 배지 생성:", insertError);
        return { ok: false, error: "배지 추가에 실패했습니다.", status: 500 };
      }
      keptIds.add(inserted.id);
      item.id = inserted.id;
    }
  }

  const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("honor_badges")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error("명예 배지 삭제:", deleteError);
      return { ok: false, error: "배지 삭제에 실패했습니다.", status: 500 };
    }
  }

  if (keptIds.size > 0) {
    const { error: clearAssignError } = await supabase
      .from("profile_honor_badges")
      .delete()
      .in("honor_badge_id", [...keptIds]);

    if (clearAssignError) {
      console.error("명예 배지 부여 초기화:", clearAssignError);
      return { ok: false, error: "배지 부여 저장에 실패했습니다.", status: 500 };
    }
  }

  const rowsToInsert: { profile_id: string; honor_badge_id: string }[] = [];
  for (const item of trimmedItems) {
    if (!keptIds.has(item.id)) continue;
    for (const profileId of item.profileIds) {
      rowsToInsert.push({
        profile_id: profileId,
        honor_badge_id: item.id,
      });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: assignError } = await supabase
      .from("profile_honor_badges")
      .insert(rowsToInsert);

    if (assignError) {
      console.error("명예 배지 부여:", assignError);
      return { ok: false, error: "학생 배지 부여에 실패했습니다.", status: 500 };
    }
  }

  return { ok: true };
}

/**
 * 과정 전체 명예 배지 섹션·배지·부여 일괄 저장
 */
export async function applyHonorBadgeSectionsForGroup(
  supabase: SupabaseClient,
  groupName: string,
  sections: HonorBadgeSectionSaveItem[],
  validStudentIds: Set<string>,
): Promise<ApplyHonorBadgesResult> {
  const trimmedSections = sections
    .map((section, index) => ({
      id: section.id.trim(),
      title: section.title.trim(),
      badges: section.badges,
      sortOrder: index,
    }))
    .filter((section) => section.title.length > 0);

  const sectionTitles = trimmedSections.map((s) => s.title);
  if (new Set(sectionTitles).size !== sectionTitles.length) {
    return {
      ok: false,
      error: "같은 제목의 섹션이 중복되었습니다.",
      status: 400,
    };
  }

  const { data: existingSections, error: fetchSectionsError } = await supabase
    .from("honor_badge_sections")
    .select("id")
    .eq("group_name", groupName);

  if (fetchSectionsError) {
    console.error("기존 섹션 조회:", fetchSectionsError);
    return { ok: false, error: "섹션 목록을 불러오지 못했습니다.", status: 500 };
  }

  const existingSectionIds = new Set(
    (existingSections ?? []).map((s) => s.id),
  );
  const keptSectionIds = new Set<string>();

  for (const section of trimmedSections) {
    let sectionId = section.id;

    if (
      !isNewHonorBadgeSectionId(section.id) &&
      existingSectionIds.has(section.id)
    ) {
      const { error: updateError } = await supabase
        .from("honor_badge_sections")
        .update({ title: section.title, sort_order: section.sortOrder })
        .eq("id", section.id)
        .eq("group_name", groupName);

      if (updateError) {
        console.error("섹션 수정:", updateError);
        return { ok: false, error: "섹션 저장에 실패했습니다.", status: 500 };
      }
      keptSectionIds.add(section.id);
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("honor_badge_sections")
        .insert({
          group_name: groupName,
          title: section.title,
          sort_order: section.sortOrder,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("섹션 생성:", insertError);
        return { ok: false, error: "섹션 추가에 실패했습니다.", status: 500 };
      }
      sectionId = inserted.id;
      keptSectionIds.add(inserted.id);
    }

    const badgeResult = await applyBadgesInSection(
      supabase,
      groupName,
      sectionId,
      section.badges,
      validStudentIds,
    );
    if (!badgeResult.ok) return badgeResult;
  }

  const sectionIdsToDelete = [...existingSectionIds].filter(
    (id) => !keptSectionIds.has(id),
  );
  if (sectionIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("honor_badge_sections")
      .delete()
      .in("id", sectionIdsToDelete);

    if (deleteError) {
      console.error("섹션 삭제:", deleteError);
      return { ok: false, error: "섹션 삭제에 실패했습니다.", status: 500 };
    }
  }

  return { ok: true };
}

/** @deprecated — 단일 목록 저장 (섹션 1개로 래핑) */
export async function applyHonorBadgesForGroup(
  supabase: SupabaseClient,
  groupName: string,
  items: HonorBadgeSaveItem[],
  validStudentIds: Set<string>,
): Promise<ApplyHonorBadgesResult> {
  const existing = await fetchHonorBadgeSectionsForGroup(supabase, groupName);
  const defaultTitle = `${groupName} 명예 배지`;

  if (existing.length === 1) {
    return applyHonorBadgeSectionsForGroup(
      supabase,
      groupName,
      [{ id: existing[0].id, title: existing[0].title, badges: items }],
      validStudentIds,
    );
  }

  if (existing.length === 0 && items.length === 0) {
    return { ok: true };
  }

  if (existing.length === 0) {
    return applyHonorBadgeSectionsForGroup(
      supabase,
      groupName,
      [{ id: `${NEW_SECTION_ID_PREFIX}default`, title: defaultTitle, badges: items }],
      validStudentIds,
    );
  }

  return applyHonorBadgeSectionsForGroup(
    supabase,
    groupName,
    existing.map((s, i) =>
      i === 0
        ? { id: s.id, title: s.title, badges: items }
        : { id: s.id, title: s.title, badges: s.badges.map((b) => ({ id: b.id, label: b.label, profileIds: b.profileIds })) },
    ),
    validStudentIds,
  );
}
