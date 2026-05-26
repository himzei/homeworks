/**
 * 게시글 작성자 표시 라벨 (과정명 · 이름)
 */
export function formatPostAuthorLabel(
  courseName?: string | null,
  authorName?: string | null,
): string {
  const trimmedCourse = courseName?.trim() ?? "";
  const trimmedName = authorName?.trim() ?? "";

  if (trimmedCourse && trimmedName) {
    return `${trimmedCourse} · ${trimmedName}`;
  }
  if (trimmedName) {
    return trimmedName;
  }
  if (trimmedCourse) {
    return trimmedCourse;
  }
  return "작성자";
}
