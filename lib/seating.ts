import type { StudentOfficerInfo } from "@/lib/class-officers";
import { parseOfficerByStudentNameFromJson } from "@/lib/class-officers";

/** 좌석 키 생성 (1-based row, col) */
export function buildSeatKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** 좌석 키 파싱 */
export function parseSeatKey(key: string): { row: number; col: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(key);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

/** 통로 열 입력 문자열 파싱 (예: "2, 4" → [2, 4]) */
export function parseAisleColumnsInput(
  input: string,
  colCount: number,
): { values: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { values: [], error: null };
  }

  const parts = trimmed.split(/[,，\s]+/).filter(Boolean);
  const parsed: number[] = [];

  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 1 || num >= colCount) {
      return {
        values: [],
        error: `통로 열은 1 이상 ${colCount - 1} 이하의 정수여야 합니다. (입력: ${part})`,
      };
    }
    if (parsed.includes(num)) {
      return { values: [], error: `중복된 통로 열 번호입니다: ${num}` };
    }
    parsed.push(num);
  }

  return { values: parsed.toSorted((a, b) => a - b), error: null };
}

/** 배정된 학생 수 계산 */
export function countAssignedSeats(
  seatAssignments: Record<string, string>,
): number {
  return Object.values(seatAssignments).filter((name) => name.trim()).length;
}

/** 이름 → 프로필 id 맵 (동명이인은 먼저 조회된 학생 사용) */
export function buildProfileIdByName(
  students: Array<{ id: string; name: string }>,
): Record<string, string> {
  const profileIdByName: Record<string, string> = {};
  for (const student of students) {
    const trimmedName = student.name.trim();
    if (!trimmedName || profileIdByName[trimmedName]) continue;
    profileIdByName[trimmedName] = student.id;
  }
  return profileIdByName;
}

/** seat_assignments 에 등록된 이름 목록 (중복 제거) */
export function getAssignedStudentNames(
  seatAssignments: Record<string, string>,
): string[] {
  return [
    ...new Set(
      Object.values(seatAssignments)
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

/** DB 레코드 타입 */
export type SeatingChartRecord = {
  id: string;
  title: string;
  group_name: string | null;
  row_count: number;
  col_count: number;
  aisle_after_columns: number[];
  seat_assignments: Record<string, string>;
  officer_by_student_name: Record<string, StudentOfficerInfo> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 저장된 반·조 스냅샷 (없으면 null → 호출부에서 live 조회) */
export function getOfficerSnapshotFromRecord(
  record: SeatingChartRecord,
): Record<string, StudentOfficerInfo> | null {
  const parsed = parseOfficerByStudentNameFromJson(
    record.officer_by_student_name ?? {},
  );
  if (Object.keys(parsed).length === 0) {
    return null;
  }
  return parsed;
}

/** 목록·폼에서 사용하는 직렬화 타입 */
export type SeatingChartListItem = {
  id: string;
  title: string;
  groupName: string | null;
  rowCount: number;
  colCount: number;
  assignedCount: number;
  totalSeats: number;
  createdAt: string;
};

export function toSeatingChartListItem(
  record: SeatingChartRecord,
): SeatingChartListItem {
  const seatAssignments = record.seat_assignments ?? {};
  return {
    id: record.id,
    title: record.title,
    groupName: record.group_name,
    rowCount: record.row_count,
    colCount: record.col_count,
    assignedCount: countAssignedSeats(seatAssignments),
    totalSeats: record.row_count * record.col_count,
    createdAt: record.created_at,
  };
}
