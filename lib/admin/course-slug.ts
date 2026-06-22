/** 슬러그 정규화 — 영문 소문자, 숫자, 하이픈만 허용 */
export function normalizeCourseSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 과정명에서 슬러그 초안 생성 (예: 16기 … → 16gi) */
export function suggestCourseSlugFromName(name: string): string {
  const trimmedName = name.trim();
  const cohortMatch = trimmedName.match(/^(\d+)기/);
  if (cohortMatch) {
    return `${cohortMatch[1]}gi`;
  }

  const slugFromName = normalizeCourseSlug(trimmedName);
  return slugFromName.slice(0, 64) || "course";
}

/** 슬러그 유효성 — 오류 메시지 또는 null */
export function validateCourseSlug(slug: string): string | null {
  const normalizedSlug = normalizeCourseSlug(slug);

  if (!normalizedSlug) {
    return "슬러그를 입력해 주세요.";
  }
  if (normalizedSlug.length < 2) {
    return "슬러그는 2자 이상 입력해 주세요.";
  }
  if (normalizedSlug.length > 64) {
    return "슬러그는 64자 이하여야 합니다.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
    return "슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
  }

  return null;
}
