/**
 * 투표 — localStorage 저장 (DB 미사용).
 * - 브라우저에만 보관
 * - 로그인 사용자만 투표 가능 (userId 기준 1인 1표)
 * - ladderGameId 는 예전 사다리 연동 데이터 호환용(선택)
 */

export type LadderVoteStatus = "draft" | "active" | "closed";

export type LadderVoteOption = {
  id: string;
  label: string;
};

/** 개별 투표 기록 */
export type LadderVoteBallot = {
  userId: string;
  optionId: string;
  /** 실명 결과 표시용 (익명 투표여도 내부 저장은 함) */
  voterName: string;
  votedAt: number;
};

/** 투표 게시글 */
export type LadderVoteRecord = {
  id: string;
  /** 예전 사다리 연동 투표만 존재 (신규 투표에는 없음) */
  ladderGameId?: string;
  title: string;
  description: string;
  /** true: 결과에 투표자 이름 미표시 */
  isAnonymous: boolean;
  options: LadderVoteOption[];
  status: LadderVoteStatus;
  authorUserId: string;
  authorName: string;
  createdAt: number;
  startedAt: number | null;
  /** 투표 종료 시각 (status === closed) */
  endedAt?: number | null;
  ballots: LadderVoteBallot[];
};

export type CreateLadderVoteInput = {
  title: string;
  description?: string;
  isAnonymous: boolean;
  optionLabels: string[];
  authorUserId: string;
  authorName: string;
};

export type UpdateLadderVoteDraftInput = {
  title?: string;
  description?: string;
  isAnonymous?: boolean;
  optionLabels?: string[];
};

export type LadderVoteValidationError =
  | { kind: "title_empty" }
  | { kind: "options_too_few" }
  | { kind: "option_empty"; index: number }
  | { kind: "not_logged_in" }
  | { kind: "not_found" }
  | { kind: "not_draft" }
  | { kind: "not_active" }
  | { kind: "not_author" }
  | { kind: "already_voted" }
  | { kind: "invalid_option" }
  | { kind: "option_label_empty" }
  | { kind: "options_max_reached" }
  | { kind: "option_duplicate" };

export type LadderVoteResultRow = {
  optionId: string;
  label: string;
  count: number;
  percent: number;
  voters: Array<{ voterName: string; votedAt: number }>;
};

const STORAGE_KEY = "ladder-votes:v1";
export const MIN_VOTE_OPTIONS = 2;
export const MAX_VOTE_OPTIONS = 12;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): LadderVoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LadderVoteRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeAll(records: LadderVoteRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 쿼터 초과 등
  }
}

function buildOptionsFromLabels(labels: string[]): LadderVoteOption[] {
  return labels.map((label) => ({
    id: createId("opt"),
    label: label.trim(),
  }));
}

function validateVoteContent(
  title: string,
  optionLabels: string[],
): LadderVoteValidationError | null {
  if (!title.trim()) {
    return { kind: "title_empty" };
  }
  const trimmed = optionLabels.map((label) => label.trim()).filter(Boolean);
  if (trimmed.length < MIN_VOTE_OPTIONS) {
    return { kind: "options_too_few" };
  }
  for (let index = 0; index < optionLabels.length; index += 1) {
    if (optionLabels[index] !== undefined && !optionLabels[index]?.trim()) {
      // 빈 줄이 섞여 있으면 해당 인덱스 에러
      if (optionLabels.some((l) => l.trim())) {
        return { kind: "option_empty", index };
      }
    }
  }
  return null;
}

/** 전체 투표 목록 (최신순) */
export function listAllLadderVotes(): LadderVoteRecord[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

/** 특정 사다리에 연결된 투표 목록 (최신순) */
export function listVotesForLadder(ladderGameId: string): LadderVoteRecord[] {
  return readAll()
    .filter((record) => record.ladderGameId === ladderGameId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getLadderVote(id: string): LadderVoteRecord | null {
  return readAll().find((record) => record.id === id) ?? null;
}

/** 초안 투표 생성 (작성 직후 status = draft) */
export function createLadderVote(
  input: CreateLadderVoteInput,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  const trimmedLabels = input.optionLabels.map((l) => l.trim());
  const error = validateVoteContent(input.title, trimmedLabels);
  if (error) return { error };

  const nonEmptyLabels = trimmedLabels.filter(Boolean);
  const record: LadderVoteRecord = {
    id: createId("vote"),
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    isAnonymous: input.isAnonymous,
    options: buildOptionsFromLabels(nonEmptyLabels),
    status: "draft",
    authorUserId: input.authorUserId,
    authorName: input.authorName,
    createdAt: Date.now(),
    startedAt: null,
    ballots: [],
  };

  const records = readAll();
  records.push(record);
  writeAll(records);
  return { vote: record };
}

/** 초안만 수정 가능 */
export function updateLadderVoteDraft(
  id: string,
  userId: string,
  patch: UpdateLadderVoteDraftInput,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return { error: { kind: "not_found" } };
  if (target.authorUserId !== userId) return { error: { kind: "not_author" } };
  if (target.status !== "draft") return { error: { kind: "not_draft" } };

  const nextTitle = patch.title !== undefined ? patch.title : target.title;
  const nextDescription =
    patch.description !== undefined ? patch.description : target.description;
  const nextAnonymous =
    patch.isAnonymous !== undefined ? patch.isAnonymous : target.isAnonymous;
  const nextOptionLabels =
    patch.optionLabels !== undefined
      ? patch.optionLabels
      : target.options.map((opt) => opt.label);

  const error = validateVoteContent(nextTitle, nextOptionLabels);
  if (error) return { error };

  target.title = nextTitle.trim();
  target.description = nextDescription.trim();
  target.isAnonymous = nextAnonymous;
  target.options = buildOptionsFromLabels(
    nextOptionLabels.map((l) => l.trim()).filter(Boolean),
  );

  writeAll(records);
  return { vote: target };
}

/** 투표 시작 — 작성자만, 초안 → 진행 중 */
export function startLadderVote(
  id: string,
  userId: string,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return { error: { kind: "not_found" } };
  if (target.authorUserId !== userId) return { error: { kind: "not_author" } };
  if (target.status !== "draft") return { error: { kind: "not_draft" } };

  const error = validateVoteContent(
    target.title,
    target.options.map((opt) => opt.label),
  );
  if (error) return { error };

  target.status = "active";
  target.startedAt = Date.now();
  writeAll(records);
  return { vote: target };
}

/** 투표 중 선택지 추가 — 작성자만, 기존 항목·득표는 유지 */
export function addLadderVoteOption(
  id: string,
  userId: string,
  label: string,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return { error: { kind: "not_found" } };
  if (target.authorUserId !== userId) return { error: { kind: "not_author" } };
  if (target.status !== "active") return { error: { kind: "not_active" } };

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { error: { kind: "option_label_empty" } };
  if (target.options.length >= MAX_VOTE_OPTIONS) {
    return { error: { kind: "options_max_reached" } };
  }
  if (
    target.options.some(
      (option) => option.label.toLowerCase() === trimmedLabel.toLowerCase(),
    )
  ) {
    return { error: { kind: "option_duplicate" } };
  }

  target.options.push({
    id: createId("opt"),
    label: trimmedLabel,
  });

  writeAll(records);
  return { vote: target };
}

/** 투표 종료 — 작성자만, 진행 중 → 종료 */
export function endLadderVote(
  id: string,
  userId: string,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return { error: { kind: "not_found" } };
  if (target.authorUserId !== userId) return { error: { kind: "not_author" } };
  if (target.status !== "active") return { error: { kind: "not_active" } };

  target.status = "closed";
  target.endedAt = Date.now();
  writeAll(records);
  return { vote: target };
}

/** 투표하기 / 수정 — 로그인 사용자, 진행 중 투표만 (이미 투표한 경우 선택지 변경) */
export function castLadderVoteBallot(
  voteId: string,
  userId: string,
  voterName: string,
  optionId: string,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  if (!userId) return { error: { kind: "not_logged_in" } };

  const records = readAll();
  const target = records.find((record) => record.id === voteId);
  if (!target) return { error: { kind: "not_found" } };
  if (target.status !== "active") return { error: { kind: "not_active" } };

  const optionExists = target.options.some((opt) => opt.id === optionId);
  if (!optionExists) return { error: { kind: "invalid_option" } };

  const displayName = voterName.trim() || "이름 없음";
  const existingIndex = target.ballots.findIndex(
    (ballot) => ballot.userId === userId,
  );

  if (existingIndex >= 0) {
    const existing = target.ballots[existingIndex];
    if (existing.optionId === optionId) {
      return { vote: target };
    }
    target.ballots[existingIndex] = {
      ...existing,
      optionId,
      voterName: displayName,
      votedAt: Date.now(),
    };
  } else {
    target.ballots.push({
      userId,
      optionId,
      voterName: displayName,
      votedAt: Date.now(),
    });
  }

  writeAll(records);
  return { vote: target };
}

/** 작성자만 삭제 */
export function deleteLadderVote(
  id: string,
  userId: string,
): { ok: true } | { error: LadderVoteValidationError } {
  const records = readAll();
  const target = records.find((record) => record.id === id);
  if (!target) return { error: { kind: "not_found" } };
  if (target.authorUserId !== userId) return { error: { kind: "not_author" } };

  writeAll(records.filter((record) => record.id !== id));
  return { ok: true };
}

/** 사다리 삭제 시 연결 투표 일괄 제거 */
export function deleteVotesForLadderGame(ladderGameId: string): void {
  writeAll(
    readAll().filter((record) => record.ladderGameId !== ladderGameId),
  );
}

/** 결과 집계 */
export function computeLadderVoteResults(
  vote: LadderVoteRecord,
): LadderVoteResultRow[] {
  const total = vote.ballots.length;
  return vote.options.map((option) => {
    const matched = vote.ballots.filter(
      (ballot) => ballot.optionId === option.id,
    );
    const count = matched.length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    const voters = vote.isAnonymous
      ? []
      : matched.map((ballot) => ({
          voterName: ballot.voterName,
          votedAt: ballot.votedAt,
        }));
    return {
      optionId: option.id,
      label: option.label,
      count,
      percent,
      voters,
    };
  });
}

export function describeVoteError(error: LadderVoteValidationError): string {
  switch (error.kind) {
    case "title_empty":
      return "투표 제목을 입력해 주세요.";
    case "options_too_few":
      return `선택지는 최소 ${MIN_VOTE_OPTIONS}개 이상이어야 합니다.`;
    case "option_empty":
      return `선택지 ${error.index + 1}번을 입력하거나 삭제해 주세요.`;
    case "not_logged_in":
      return "로그인한 사용자만 투표할 수 있습니다.";
    case "not_found":
      return "투표를 찾을 수 없습니다.";
    case "not_draft":
      return "이미 시작된 투표는 수정할 수 없습니다.";
    case "not_active":
      return "아직 시작되지 않았거나 이미 종료된 투표입니다.";
    case "not_author":
      return "작성자만 이 작업을 할 수 있습니다.";
    case "already_voted":
      return "이미 투표하셨습니다.";
    case "invalid_option":
      return "유효하지 않은 선택지입니다.";
    case "option_label_empty":
      return "추가할 항목 이름을 입력해 주세요.";
    case "options_max_reached":
      return `선택지는 최대 ${MAX_VOTE_OPTIONS}개까지 추가할 수 있습니다.`;
    case "option_duplicate":
      return "이미 같은 이름의 선택지가 있습니다.";
  }
}
