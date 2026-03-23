/**
 * 과제 수정 페이지용 메모리 캐시
 * 탭 전환 후 다시 수정 버튼 클릭 시 즉시 폼 표시 (Supabase 요청 지연 회피)
 */

interface CachedAssignment {
  id: string;
  title: string;
  content: string;
  group_name: string;
  start_date: string;
  end_date: string;
  lecture_material_url: string | null;
  previous_answer_url: string | null;
  created_by: string;
}

const cache = new Map<string, { data: CachedAssignment; savedAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5분

export function getCachedAssignment(id: string): CachedAssignment | null {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > TTL_MS) {
    cache.delete(id);
    return null;
  }
  return entry.data;
}

export function setCachedAssignment(data: CachedAssignment): void {
  cache.set(data.id, { data, savedAt: Date.now() });
}

/** 저장/삭제 시 해당 과제 캐시 무효화 */
export function invalidateAssignmentCache(id: string): void {
  cache.delete(id);
}
