import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST in() URL 길이 제한 대비 — ID 목록을 나눠 조회 후 병합 */
const DEFAULT_IN_CHUNK_SIZE = 150;

type ChunkedInExtraFilter = {
  column: string;
  values: string[];
};

export async function fetchRowsWithChunkedInFilter<
  T extends Record<string, unknown>,
>(options: {
  supabase: SupabaseClient;
  table: string;
  select: string;
  filterColumn: string;
  filterValues: string[];
  chunkSize?: number;
  /** 추가 in() 필터 (예: assignment_id 목록) */
  extraInFilter?: ChunkedInExtraFilter;
}): Promise<T[]> {
  const {
    supabase,
    table,
    select,
    filterColumn,
    filterValues,
    chunkSize = DEFAULT_IN_CHUNK_SIZE,
    extraInFilter,
  } = options;

  const uniqueValues = [...new Set(filterValues.filter(Boolean))];
  if (uniqueValues.length === 0) {
    return [];
  }

  const mergedRows: T[] = [];

  for (let offset = 0; offset < uniqueValues.length; offset += chunkSize) {
    const chunk = uniqueValues.slice(offset, offset + chunkSize);
    let query = supabase.from(table).select(select).in(filterColumn, chunk);

    if (extraInFilter && extraInFilter.values.length > 0) {
      query = query.in(extraInFilter.column, extraInFilter.values);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[${table}] chunked in(${filterColumn}) 조회 오류:`, error);
      continue;
    }

    if (data?.length) {
      mergedRows.push(...(data as unknown as T[]));
    }
  }

  return mergedRows;
}
