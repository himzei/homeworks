/**
 * 사다리게임 도메인 로직 + localStorage 저장소.
 * - 게시판 형태(목록·상세·작성)에서 공통으로 사용
 * - 서버에 저장하지 않고 브라우저 localStorage에 보관
 */

import { GROUP_OPTIONS } from "@/lib/constants";

/** 콤보박스에서 사용하는 기수 옵션 (짧은 라벨 + 원본 라벨) */
export type SelectableLadderGroup = {
  value: string;
  fullLabel: string;
  shortLabel: string;
};

/**
 * 사다리 콤보박스용 기수 목록.
 * - 빈 옵션 제외
 * - shortLabel: "13기 / 14기 / 15기" 처럼 첫 토큰만
 */
export const SELECTABLE_LADDER_GROUPS: SelectableLadderGroup[] = GROUP_OPTIONS
  .filter((option) => option.value)
  .map((option) => ({
    value: option.value,
    fullLabel: option.label,
    shortLabel: option.value.split(" ")[0] || option.label,
  }));

/** 사다리 한 줄(가로 연결) - leftCol 과 leftCol+1 을 잇는다 (양방향) */
export type LadderRung = {
  row: number;
  leftCol: number;
};

/**
 * 점프 가로줄 - 일반 가로줄(LadderRung) 과 동일한 의미이나 span 이 더 큰 가로줄.
 * - 같은 row 안에서 `fromCol` 과 `toCol` 두 column 을 잇는 수평 가로줄
 * - 마커는 양방향 swap: `fromCol` 에 있으면 `toCol` 로, `toCol` 에 있어도 `fromCol` 로
 * - |toCol - fromCol| 가 span (2, 3, 4 중 하나)
 * - direction 은 (구버전 호환용) 시각적 기울기 의도를 나타내지만
 *   현재 렌더링·추적에는 영향 없음 (그림은 항상 수평선으로 그려짐)
 */
export type DiagonalRung = {
  row: number;
  fromCol: number;
  toCol: number;
  direction: 1 | -1;
};

/** 단일 사다리게임 레코드 (게시글) */
export type LadderGameRecord = {
  id: string;
  title: string;
  participantCount: number;
  participantNames: string[];
  /** 사다리 아래쪽 결과(당첨/순번 등) */
  resultItems: string[];
  rungs: LadderRung[];
  /** 2~4 칸을 건너뛰는 대각선 가로줄 (구버전 레코드 호환: 없을 수 있음) */
  diagonalRungs?: DiagonalRung[];
  rowCount: number;
  createdAt: number;
  /**
   * 최초로 "게임 시작"을 누른 시점 (ms epoch).
   * - null / undefined: 아직 게임을 시작하지 않음
   * - 값이 있으면 결과 고정 → 참가자·결과 수정 / 사다리 다시 섞기 불가
   */
  playedAt?: number | null;
};

/** 사다리 행(높이) 개수 - 클수록 세로로 길어지고 가로줄 배치 공간이 늘어남 */
export const LADDER_ROW_COUNT = 32;
/** 사다리 본체 최소 높이(px) - UI 렌더·이미지 캡처 공통 */
export const LADDER_BODY_MIN_HEIGHT_PX = 540;
export const MIN_PARTICIPANTS = 2;
export const MAX_PARTICIPANTS = 35;
/** 인접한 두 열(leftCol ~ leftCol+1) 사이에 최소한 보장하는 가로줄 개수 */
export const MIN_RUNGS_PER_COLUMN_PAIR = 5;
/** 대각선 가로줄에 허용된 span 후보 (몇 칸을 건너뛸지) */
const DIAGONAL_SPAN_OPTIONS = [2, 3, 4] as const;
const STORAGE_KEY = "ladder-games:v1";

/**
 * 한 행 안의 column 점유 범위 관리.
 * - 일반 가로줄: leftCol ~ leftCol+1 (2칸 점유)
 * - 대각선:      min(fromCol, toCol) ~ max(fromCol, toCol) (span+1 칸 점유)
 * - 같은 행에서 점유 범위가 겹치거나 endpoint 가 같으면 마커 추적이 모호해지므로 회피
 *   (서로 다른 column 끝점만 닿는 "인접" 은 허용)
 */
function isRangeOverlapping(
  occupiedRanges: Array<[number, number]>,
  newStart: number,
  newEnd: number,
): boolean {
  const lo = Math.min(newStart, newEnd);
  const hi = Math.max(newStart, newEnd);
  // [s, e] 와 [lo, hi] 가 겹치거나 endpoint 공유 → hi >= s && lo <= e
  return occupiedRanges.some(([s, e]) => hi >= s && lo <= e);
}

/**
 * 사다리 가로줄(일반 + 대각선) 생성.
 *
 * 1) 일반 가로줄: **각 인접 열 쌍**(leftCol = 0 ~ participantCount-2)마다
 *    최소 {@link MIN_RUNGS_PER_COLUMN_PAIR} 개 보장.
 * 2) 대각선 가로줄: span 2~4 칸을 건너뛰며 row 사이를 가로지름.
 *    - 대략 참가자 수 × 1.5 개 정도 추가 (행 수가 충분할 때)
 *    - direction(\, /) 도 랜덤. 추적 로직에서는 양방향으로 동작
 *
 * 같은 row 에서 점유된 column 범위가 겹치거나 endpoint 를 공유하면 회피.
 */
export function buildLadder(participantCount: number): {
  rungs: LadderRung[];
  diagonalRungs: DiagonalRung[];
} {
  const rungs: LadderRung[] = [];
  const diagonalRungs: DiagonalRung[] = [];

  if (participantCount < 2) {
    return { rungs, diagonalRungs };
  }

  /** row → 점유된 [colMin, colMax] 범위 목록 */
  const occupancyByRow = new Map<number, Array<[number, number]>>();
  const getOccupancy = (row: number) => {
    const existing = occupancyByRow.get(row);
    if (existing) return existing;
    const created: Array<[number, number]> = [];
    occupancyByRow.set(row, created);
    return created;
  };

  // 1) 각 열 쌍 최소 MIN_RUNGS_PER_COLUMN_PAIR 개 보장
  for (let leftCol = 0; leftCol < participantCount - 1; leftCol += 1) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = LADDER_ROW_COUNT * 6;
    while (placed < MIN_RUNGS_PER_COLUMN_PAIR && attempts < maxAttempts) {
      attempts += 1;
      const row = Math.floor(Math.random() * LADDER_ROW_COUNT);
      const occ = getOccupancy(row);
      if (isRangeOverlapping(occ, leftCol, leftCol + 1)) continue;
      rungs.push({ row, leftCol });
      occ.push([leftCol, leftCol + 1]);
      placed += 1;
    }
  }

  // 2) 대각선 가로줄 추가 - span 2/3/4 중 랜덤
  const spanCandidates = DIAGONAL_SPAN_OPTIONS.filter(
    (span) => span < participantCount,
  );
  if (spanCandidates.length > 0) {
    const targetDiagonalCount = Math.min(
      Math.max(participantCount, 3),
      Math.floor(LADDER_ROW_COUNT * (participantCount / 6)),
    );
    let attempts = 0;
    const maxAttempts = targetDiagonalCount * 12;
    while (diagonalRungs.length < targetDiagonalCount && attempts < maxAttempts) {
      attempts += 1;
      const span =
        spanCandidates[Math.floor(Math.random() * spanCandidates.length)];
      const row = Math.floor(Math.random() * LADDER_ROW_COUNT);
      const fromColMax = participantCount - 1 - span;
      if (fromColMax < 0) continue;
      const fromCol = Math.floor(Math.random() * (fromColMax + 1));
      const toCol = fromCol + span;
      const occ = getOccupancy(row);
      if (isRangeOverlapping(occ, fromCol, toCol)) continue;
      // direction: 시각적 기울기. 1 → "\", -1 → "/"
      const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      diagonalRungs.push({ row, fromCol, toCol, direction });
      occ.push([fromCol, toCol]);
    }
  }

  rungs.sort((a, b) => a.row - b.row || a.leftCol - b.leftCol);
  diagonalRungs.sort((a, b) => a.row - b.row || a.fromCol - b.fromCol);
  return { rungs, diagonalRungs };
}

/**
 * (구버전 호환용) 일반 가로줄만 생성.
 * - 기존 호출처에서 사용 가능하도록 남겨둠. 신규 코드에서는 {@link buildLadder} 권장.
 */
export function buildLadderRungs(participantCount: number): LadderRung[] {
  return buildLadder(participantCount).rungs;
}

/**
 * 시작 열에서 출발해 각 row 를 통과한 뒤의 열 위치 시퀀스를 반환.
 * - 반환 배열 길이 = rowCount + 1
 * - steps[0] = startColumn (출발), steps[i] = i번째 row 통과 직후 열 위치
 * - 한 row 에서 대각선 가로줄이 적용되면 일반 가로줄보다 우선 처리
 *   (생성 시 같은 row 에 둘 다 column 충돌 없이만 들어가므로 실제 둘 다 마커에 영향 줄 일은 없음)
 * - 애니메이션(각 row 별 마커 이동)에서 사용
 */
export function traceLadderPathSteps(
  rungs: LadderRung[],
  diagonalRungs: DiagonalRung[],
  rowCount: number,
  startColumn: number,
): number[] {
  const rungsByRow = new Map<number, LadderRung[]>();
  for (const rung of rungs) {
    const list = rungsByRow.get(rung.row) ?? [];
    list.push(rung);
    rungsByRow.set(rung.row, list);
  }
  const diagonalsByRow = new Map<number, DiagonalRung[]>();
  for (const diag of diagonalRungs) {
    const list = diagonalsByRow.get(diag.row) ?? [];
    list.push(diag);
    diagonalsByRow.set(diag.row, list);
  }

  const steps: number[] = [startColumn];
  let currentColumn = startColumn;
  for (let row = 0; row < rowCount; row += 1) {
    // 대각선 먼저 확인 (양방향: fromCol 또는 toCol 어느쪽에 있어도 반대편으로 이동)
    const rowDiagonals = diagonalsByRow.get(row);
    const matchedDiag = rowDiagonals?.find(
      (diag) =>
        diag.fromCol === currentColumn || diag.toCol === currentColumn,
    );
    if (matchedDiag) {
      currentColumn =
        matchedDiag.fromCol === currentColumn
          ? matchedDiag.toCol
          : matchedDiag.fromCol;
    } else {
      const rowRungs = rungsByRow.get(row) ?? [];
      const hitRight = rowRungs.find((rung) => rung.leftCol === currentColumn);
      if (hitRight) {
        currentColumn += 1;
      } else {
        const hitLeft = rowRungs.find(
          (rung) => rung.leftCol === currentColumn - 1,
        );
        if (hitLeft) {
          currentColumn -= 1;
        }
      }
    }
    steps.push(currentColumn);
  }
  return steps;
}

/** 시작 열 → 도착 열 추적 (편의 함수) */
export function traceLadderPath(
  rungs: LadderRung[],
  diagonalRungs: DiagonalRung[],
  rowCount: number,
  startColumn: number,
): number {
  const steps = traceLadderPathSteps(rungs, diagonalRungs, rowCount, startColumn);
  return steps[steps.length - 1];
}

// =====================
// localStorage 저장소
// =====================

/** SSR 가드 - 브라우저에서만 호출 */
function readAll(): LadderGameRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LadderGameRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // 저장된 데이터가 깨진 경우 빈 배열로 복구
    return [];
  }
}

function writeAll(records: LadderGameRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 쿼터 초과·시크릿 모드 등은 조용히 무시
  }
}

/** 최근에 만든 순으로 정렬된 목록 반환 */
export function listLadderGames(): LadderGameRecord[] {
  const records = readAll();
  return [...records].sort((a, b) => b.createdAt - a.createdAt);
}

export function getLadderGame(id: string): LadderGameRecord | null {
  return readAll().find((record) => record.id === id) ?? null;
}

export type CreateLadderGameInput = {
  title: string;
  participantCount: number;
  /** 선택: 미지정 시 빈 문자열 배열로 채워짐 (상세에서 편집) */
  participantNames?: string[];
  resultItems?: string[];
};

/** 새 사다리게임 생성 (사다리 가로줄 + 대각선 가로줄도 함께 생성) */
export function createLadderGame(
  input: CreateLadderGameInput,
): LadderGameRecord {
  const participantCount = input.participantCount;
  const emptyArray = Array.from({ length: participantCount }, () => "");
  const { rungs, diagonalRungs } = buildLadder(participantCount);

  const record: LadderGameRecord = {
    id: createLadderId(),
    title: input.title.trim() || "이름 없는 사다리",
    participantCount,
    participantNames: input.participantNames ?? emptyArray,
    resultItems: input.resultItems ?? emptyArray,
    rungs,
    diagonalRungs,
    rowCount: LADDER_ROW_COUNT,
    createdAt: Date.now(),
  };

  const records = readAll();
  records.push(record);
  writeAll(records);
  return record;
}

export type UpdateLadderGameInput = Partial<
  Pick<LadderGameRecord, "title" | "participantNames" | "resultItems">
>;

/**
 * 사다리게임 부분 업데이트.
 * - participantCount(인원수)는 생성 시 결정되며 여기선 변경 불가
 * - 길이가 다른 배열이 들어오면 무시(방어)
 */
export function updateLadderGame(
  id: string,
  patch: UpdateLadderGameInput,
): LadderGameRecord | null {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return null;

  if (patch.title !== undefined) {
    target.title = patch.title.trim() || "이름 없는 사다리";
  }
  if (
    patch.participantNames &&
    patch.participantNames.length === target.participantCount
  ) {
    target.participantNames = patch.participantNames;
  }
  if (
    patch.resultItems &&
    patch.resultItems.length === target.participantCount
  ) {
    target.resultItems = patch.resultItems;
  }

  writeAll(records);
  return target;
}

/**
 * 기존 사다리의 가로줄만 다시 섞기 (재추첨).
 * - 이미 게임이 시작된(`playedAt` 존재) 사다리는 결과 고정이므로 변경 거부
 */
export function reshuffleLadderGame(id: string): LadderGameRecord | null {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return null;
  if (target.playedAt) return target; // 이미 게임 완료된 사다리는 그대로 반환

  const { rungs, diagonalRungs } = buildLadder(target.participantCount);
  target.rungs = rungs;
  target.diagonalRungs = diagonalRungs;
  writeAll(records);
  return target;
}

/**
 * 사다리를 "게임 시작됨" 상태로 표시 (결과 고정).
 * - 이미 표시된 경우 그대로 반환 (멱등)
 */
export function markLadderGameAsPlayed(
  id: string,
): LadderGameRecord | null {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return null;
  if (target.playedAt) return target;

  target.playedAt = Date.now();
  writeAll(records);
  return target;
}

/** 사다리가 이미 게임 시작되어 결과가 고정되었는지 */
export function isLadderGamePlayed(game: LadderGameRecord): boolean {
  return Boolean(game.playedAt);
}

export function deleteLadderGame(id: string): void {
  const records = readAll().filter((record) => record.id !== id);
  writeAll(records);
}

function createLadderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ladder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// =====================
// 배열 섞기
// =====================

/**
 * 문자열 배열을 Fisher-Yates 로 무작위 섞어 새 배열로 반환.
 * - 참가자 이름·결과 항목 순서 섞기에 사용
 */
export function shuffleStringArray(items: string[]): string[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = temp;
  }
  return shuffled;
}

// =====================
// 입력 검증
// =====================

export type LadderValidationError =
  | { kind: "count_out_of_range" }
  | { kind: "names_empty"; index: number }
  | { kind: "names_duplicated"; name: string }
  | { kind: "results_all_empty" };

/**
 * 사다리 입력 검증.
 * - 참가자: 모든 칸이 채워져야 함 (중복 불가)
 * - 결과: 최소 1개 이상 채워지면 OK (나머지는 빈 칸 허용)
 */
export function validateLadderInput(
  participantNames: string[],
  resultItems: string[],
): LadderValidationError | null {
  const count = participantNames.length;
  if (count < MIN_PARTICIPANTS || count > MAX_PARTICIPANTS) {
    return { kind: "count_out_of_range" };
  }
  if (resultItems.length !== count) {
    // UI가 인원수에 맞춰 동기화하므로 일반적으로 발생하지 않지만 방어
    return { kind: "count_out_of_range" };
  }

  for (let i = 0; i < count; i += 1) {
    if (!participantNames[i]?.trim()) {
      return { kind: "names_empty", index: i };
    }
  }

  const hasAnyResult = resultItems.some((item) => item.trim().length > 0);
  if (!hasAnyResult) {
    return { kind: "results_all_empty" };
  }

  const seen = new Set<string>();
  for (const name of participantNames) {
    const key = name.trim();
    if (seen.has(key)) {
      return { kind: "names_duplicated", name: key };
    }
    seen.add(key);
  }

  return null;
}
