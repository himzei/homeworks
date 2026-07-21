/**
 * 사다리게임 도메인 로직 + DB(Supabase) API 클라이언트.
 * - /ladder 게시판에서 승인된 모든 회원이 동일한 데이터를 조회·편집
 * - API: /api/ladder-games ...
 */

import { GROUP_OPTIONS } from "@/lib/constants";
import {
  formatShortGroupLabel,
  parseCohortNumberFromGroupName,
} from "@/lib/fetch-group-options";

/** 콤보박스에서 사용하는 기수 옵션 (짧은 라벨 + 원본 라벨) */
export type SelectableLadderGroup = {
  value: string;
  fullLabel: string;
  shortLabel: string;
};

/** 기수 옵션을 최신 기수 우선으로 정렬 */
function sortLadderGroupsByCohortDesc(
  groups: SelectableLadderGroup[],
): SelectableLadderGroup[] {
  return groups.toSorted((groupA, groupB) => {
    const cohortA = parseCohortNumberFromGroupName(groupA.value);
    const cohortB = parseCohortNumberFromGroupName(groupB.value);
    if (cohortA !== null && cohortB !== null && cohortB !== cohortA) {
      return cohortB - cohortA;
    }
    if (cohortA !== null && cohortB === null) return -1;
    if (cohortA === null && cohortB !== null) return 1;
    return groupA.value.localeCompare(groupB.value, "ko");
  });
}

/** group_name 목록 → 사다리 콤보박스 옵션 */
export function toSelectableLadderGroups(
  groupNames: string[],
): SelectableLadderGroup[] {
  const uniqueNames = [...new Set(
    groupNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  )];
  const groups = uniqueNames.map((name) => ({
    value: name,
    fullLabel: name,
    shortLabel: formatShortGroupLabel(name),
  }));
  return sortLadderGroupsByCohortDesc(groups);
}

/**
 * 사다리 콤보박스용 기수 목록 (정적 폴백).
 * - 빈 옵션 제외
 * - shortLabel: "13기 / 14기 / 15기" 처럼 첫 토큰만
 * - 운영에서는 LadderGameForm 이 training_courses 를 우선 조회
 */
export const SELECTABLE_LADDER_GROUPS: SelectableLadderGroup[] =
  toSelectableLadderGroups(
    GROUP_OPTIONS.filter((option) => option.value).map(
      (option) => option.value,
    ),
  );

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

/**
 * 같은 결과를 받지 않아야 하는 참가자 쌍 (관리자 설정).
 * - nameA / nameB: 참가자 이름( trim 기준 일치 )
 */
export type LadderExclusionPair = {
  nameA: string;
  nameB: string;
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
  authorUserId?: string;
  authorName?: string;
  /** 작성 당시 과정명 (profiles.group_name) */
  authorCourseName?: string;
  createdAt: number;
  /**
   * 최초로 "게임 시작"을 누른 시점 (ms epoch).
   * - null / undefined: 아직 게임을 시작하지 않음
   * - 값이 있으면 결과 고정 → 참가자·결과 수정 / 사다리 다시 섞기 불가
   */
  playedAt?: number | null;
  /** 같은 결과 금지 쌍 (응답 시 기수 규칙 반영된 실효 쌍일 수 있음) */
  exclusionPairs?: LadderExclusionPair[];
  /** 참가자를 불러온 기수(과정명). 기수 공통 금지 규칙 적용에 사용 */
  groupName?: string | null;
};

/** 제외 쌍을 만족하는 사다리를 찾을 때 최대 시도 횟수 */
export const LADDER_EXCLUSION_MAX_ATTEMPTS = 300;

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

/**
 * 추가로 "보장해서" 배치되는 긴 점프 가로줄 명세.
 * - span: 몇 칸을 건너뛰는지 (예: 5 → 5칸 건너 swap)
 * - count: 보장 개수
 * - 참가자 수가 span 보다 작거나 같으면 (배치 공간 부족) 자동 스킵
 * - row 충돌·column 충돌이 심해 maxAttempts 안에 못 넣은 경우엔 가능한 만큼만 배치
 */
const REQUIRED_LONG_DIAGONALS: ReadonlyArray<{
  span: number;
  count: number;
}> = [
  { span: 5, count: 2 },
  { span: 6, count: 2 },
  { span: 7, count: 2 },
  { span: 8, count: 2 },
  { span: 10, count: 1 },
];

type ApiError = string | { kind?: string; index?: number };

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const error = (json as { error?: ApiError })?.error;
    throw error ?? "unknown";
  }

  return json as T;
}

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

  // 3) 긴 점프 가로줄 보장 배치 (5/6/7/8 칸 각 2개, 10칸 1개)
  //    - span 이 큰 것부터 시도해서 자리 확보 우선순위 부여
  //    - 참가자 수가 span 보다 작거나 같으면 (배치 공간이 없음) 자동 스킵
  const longDiagonalsPriority = [...REQUIRED_LONG_DIAGONALS].sort(
    (a, b) => b.span - a.span,
  );
  for (const { span, count } of longDiagonalsPriority) {
    const fromColMax = participantCount - 1 - span;
    if (fromColMax < 0) continue; // 참가자 수 부족 - 배치 불가
    let placed = 0;
    let attempts = 0;
    const maxAttempts = LADDER_ROW_COUNT * 10;
    while (placed < count && attempts < maxAttempts) {
      attempts += 1;
      const row = Math.floor(Math.random() * LADDER_ROW_COUNT);
      const fromCol = Math.floor(Math.random() * (fromColMax + 1));
      const toCol = fromCol + span;
      const occ = getOccupancy(row);
      if (isRangeOverlapping(occ, fromCol, toCol)) continue;
      const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      diagonalRungs.push({ row, fromCol, toCol, direction });
      occ.push([fromCol, toCol]);
      placed += 1;
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
// 같은 결과 금지 (exclusion pairs)
// =====================

/** 제외 쌍 정규화: trim, 동일인 제거, 순서 무관 중복 제거 */
export function normalizeExclusionPairs(
  pairs: LadderExclusionPair[],
): LadderExclusionPair[] {
  const seen = new Set<string>();
  const normalized: LadderExclusionPair[] = [];

  for (const pair of pairs) {
    const nameA = pair.nameA.trim();
    const nameB = pair.nameB.trim();
    if (!nameA || !nameB || nameA === nameB) continue;

    // 순서 무관 키 (가나다순)
    const key =
      nameA < nameB ? `${nameA}\0${nameB}` : `${nameB}\0${nameA}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ nameA, nameB });
  }

  return normalized;
}

/**
 * 요청 body 등에서 제외 쌍 배열 파싱.
 * - 잘못된 항목은 건너뜀
 */
export function parseExclusionPairsInput(
  value: unknown,
): LadderExclusionPair[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return null;

  const pairs: LadderExclusionPair[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const nameA = typeof raw.nameA === "string" ? raw.nameA : "";
    const nameB = typeof raw.nameB === "string" ? raw.nameB : "";
    pairs.push({ nameA, nameB });
  }
  return normalizeExclusionPairs(pairs);
}

/** 참가자 이름 → 결과 문자열 맵 (trim 이름 키) */
export function resolveParticipantResultMap(
  participantNames: string[],
  resultItems: string[],
  rungs: LadderRung[],
  diagonalRungs: DiagonalRung[],
  rowCount: number,
): Map<string, string> {
  const resultByName = new Map<string, string>();
  const count = Math.min(participantNames.length, resultItems.length);

  for (let startColumn = 0; startColumn < count; startColumn += 1) {
    const name = participantNames[startColumn]?.trim();
    if (!name) continue;
    const endColumn = traceLadderPath(
      rungs,
      diagonalRungs,
      rowCount,
      startColumn,
    );
    resultByName.set(name, (resultItems[endColumn] ?? "").trim());
  }

  return resultByName;
}

/**
 * 제외 쌍이 현재 사다리 배정에서 같은 결과를 받는지 검사.
 * - 이름이 참가자 목록에 없으면 해당 쌍은 무시
 * - 둘 다 결과가 같고(빈 문자열 포함)면 위반
 */
export function findExclusionViolations(
  participantNames: string[],
  resultItems: string[],
  rungs: LadderRung[],
  diagonalRungs: DiagonalRung[],
  rowCount: number,
  exclusionPairs: LadderExclusionPair[],
): LadderExclusionPair[] {
  if (exclusionPairs.length === 0) return [];

  const resultByName = resolveParticipantResultMap(
    participantNames,
    resultItems,
    rungs,
    diagonalRungs,
    rowCount,
  );

  const violations: LadderExclusionPair[] = [];
  for (const pair of exclusionPairs) {
    const resultA = resultByName.get(pair.nameA.trim());
    const resultB = resultByName.get(pair.nameB.trim());
    // 둘 다 참가자에 있을 때만 검사
    if (resultA === undefined || resultB === undefined) continue;
    if (resultA === resultB) {
      violations.push(pair);
    }
  }
  return violations;
}

export function hasExclusionViolation(
  participantNames: string[],
  resultItems: string[],
  rungs: LadderRung[],
  diagonalRungs: DiagonalRung[],
  rowCount: number,
  exclusionPairs: LadderExclusionPair[],
): boolean {
  return (
    findExclusionViolations(
      participantNames,
      resultItems,
      rungs,
      diagonalRungs,
      rowCount,
      exclusionPairs,
    ).length > 0
  );
}

/**
 * 제외 쌍을 만족하는 사다리 가로줄 생성.
 * - 쌍이 없으면 일반 buildLadder 1회
 * - 최대 시도 후에도 못 찾으면 null (결과 분포상 불가능할 수 있음)
 */
export function buildLadderRespectingExclusions(
  participantCount: number,
  participantNames: string[],
  resultItems: string[],
  exclusionPairs: LadderExclusionPair[],
  maxAttempts: number = LADDER_EXCLUSION_MAX_ATTEMPTS,
): { rungs: LadderRung[]; diagonalRungs: DiagonalRung[] } | null {
  const pairs = normalizeExclusionPairs(exclusionPairs);
  if (pairs.length === 0) {
    return buildLadder(participantCount);
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const ladder = buildLadder(participantCount);
    if (
      !hasExclusionViolation(
        participantNames,
        resultItems,
        ladder.rungs,
        ladder.diagonalRungs,
        LADDER_ROW_COUNT,
        pairs,
      )
    ) {
      return ladder;
    }
  }

  return null;
}

// =====================
// DB API 클라이언트
// =====================

/** 최근에 만든 순으로 정렬된 목록 반환 */
export async function listLadderGames(): Promise<LadderGameRecord[]> {
  const data = await requestJson<{ games: LadderGameRecord[] }>(
    "/api/ladder-games",
    { method: "GET" },
  );
  return data.games;
}

export async function fetchLadderGame(id: string): Promise<LadderGameRecord | null> {
  try {
    const data = await requestJson<{ game: LadderGameRecord }>(
      `/api/ladder-games/${id}`,
      { method: "GET" },
    );
    return data.game;
  } catch (error) {
    if (error === "not_found") return null;
    throw error;
  }
}

/** @deprecated fetchLadderGame 사용 권장 */
export async function getLadderGame(id: string): Promise<LadderGameRecord | null> {
  return fetchLadderGame(id);
}

export type CreateLadderGameInput = {
  title: string;
  participantCount: number;
  /** 선택: 미지정 시 빈 문자열 배열로 채워짐 (상세에서 편집) */
  participantNames?: string[];
  resultItems?: string[];
  /** 참가자를 불러온 기수(과정명) */
  groupName?: string | null;
  /** @deprecated 기수 공통 규칙으로 이전. 호환용으로만 유지 */
  exclusionPairs?: LadderExclusionPair[];
};

/** 새 사다리게임 생성 (사다리 가로줄 + 대각선 가로줄도 함께 생성) */
export async function createLadderGame(
  input: CreateLadderGameInput,
): Promise<LadderGameRecord> {
  const data = await requestJson<{ game: LadderGameRecord }>(
    "/api/ladder-games",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data.game;
}

export type UpdateLadderGameInput = Partial<
  Pick<
    LadderGameRecord,
    "title" | "participantNames" | "resultItems" | "groupName"
  >
>;

/**
 * 사다리게임 부분 업데이트.
 * - participantCount(인원수)는 생성 시 결정되며 여기선 변경 불가
 * - 길이가 다른 배열이 들어오면 무시(방어)
 * - 기수 공통 금지 규칙이 있으면 서버에서 사다리를 다시 맞춤
 */
export async function updateLadderGame(
  id: string,
  patch: UpdateLadderGameInput,
): Promise<LadderGameRecord | null> {
  try {
    const data = await requestJson<{ game: LadderGameRecord }>(
      `/api/ladder-games/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    );
    return data.game;
  } catch (error) {
    // 제외 조건 불만족은 UI에서 별도 안내
    if (error === "exclusion_unsatisfiable") throw error;
    if (error === "not_found" || error === "already_played") {
      return null;
    }
    throw error;
  }
}

/**
 * 기존 사다리의 가로줄만 다시 섞기 (재추첨).
 * - 이미 게임이 시작된(`playedAt` 존재) 사다리는 결과 고정이므로 변경 거부
 * - 제외 쌍이 있으면 조건을 만족할 때까지 재생성
 */
export async function reshuffleLadderGame(
  id: string,
): Promise<LadderGameRecord | null> {
  try {
    const data = await requestJson<{ game: LadderGameRecord }>(
      `/api/ladder-games/${id}/reshuffle`,
      { method: "POST" },
    );
    return data.game;
  } catch (error) {
    if (error === "exclusion_unsatisfiable") throw error;
    if (error === "not_found" || error === "already_played") {
      return null;
    }
    throw error;
  }
}

/**
 * 사다리를 "게임 시작됨" 상태로 표시 (결과 고정).
 * - 이미 표시된 경우 그대로 반환 (멱등)
 * - 제외 쌍 위반 시 서버에서 사다리를 다시 맞춘 뒤 시작
 */
export async function markLadderGameAsPlayed(
  id: string,
): Promise<LadderGameRecord | null> {
  try {
    const data = await requestJson<{ game: LadderGameRecord }>(
      `/api/ladder-games/${id}/play`,
      { method: "POST" },
    );
    return data.game;
  } catch (error) {
    if (error === "exclusion_unsatisfiable") throw error;
    if (error === "not_found") return null;
    throw error;
  }
}

/** 사다리가 이미 게임 시작되어 결과가 고정되었는지 */
export function isLadderGamePlayed(game: LadderGameRecord): boolean {
  return Boolean(game.playedAt);
}

export async function deleteLadderGame(id: string): Promise<boolean> {
  try {
    await requestJson<{ ok: true }>(`/api/ladder-games/${id}`, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    if (error === "not_found") return false;
    throw error;
  }
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
