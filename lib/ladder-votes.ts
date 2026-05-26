/**
 * 투표 — DB(Supabase) 저장 버전.
 * - /vote 게시판에서 모든 승인된 회원이 동일한 데이터를 조회
 * - 작성자는 초안 생성/시작/종료/삭제 및 진행 중 선택지 추가 가능
 * - 사용자는 진행 중 투표에 1인 1표(수정 가능)
 *
 * ⚠️ 기존 localStorage 구현을 API 호출 기반으로 교체했습니다.
 * - API: /api/votes ...
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
  /** 작성 당시 과정명 (profiles.group_name) */
  authorCourseName?: string;
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

export const MIN_VOTE_OPTIONS = 2;
export const MAX_VOTE_OPTIONS = 12;

type ApiError =
  | { kind: LadderVoteValidationError["kind"]; index?: number }
  | "unknown";

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
    const error = (json as any)?.error as ApiError | undefined;
    throw error ?? "unknown";
  }

  return json as T;
}

/** 전체 투표 목록 (최신순) */
export async function listAllLadderVotes(): Promise<LadderVoteRecord[]> {
  const data = await requestJson<{ votes: LadderVoteRecord[] }>("/api/votes", {
    method: "GET",
  });
  return data.votes;
}

/** 특정 사다리에 연결된 투표 목록 (최신순) */
export async function listVotesForLadder(_ladderGameId: string): Promise<LadderVoteRecord[]> {
  // 현재 /vote 게시판은 사다리 연동을 사용하지 않으므로 목록 API로 통일합니다.
  // 필요 시 vote.ladderGameId 컬럼을 추가해 필터 API로 확장하면 됩니다.
  return listAllLadderVotes();
}

export function getLadderVote(id: string): LadderVoteRecord | null {
  // 클라이언트 컴포넌트에서 동기 접근하던 기존 API를 유지하기 어렵기 때문에
  // 상세는 반드시 async API로 조회하도록 변경했습니다.
  // (VoteDetail.tsx에서 useEffect로 불러오는 구조에 맞춤)
  void id;
  return null;
}

/** 초안 투표 생성 (작성 직후 status = draft) */
export async function createLadderVote(
  input: CreateLadderVoteInput,
): Promise<{ vote: LadderVoteRecord } | { error: LadderVoteValidationError }> {
  try {
    const data = await requestJson<{ vote: LadderVoteRecord }>("/api/votes", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { vote: data.vote };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 초안만 수정 가능 */
export function updateLadderVoteDraft(
  id: string,
  userId: string,
  patch: UpdateLadderVoteDraftInput,
): { vote: LadderVoteRecord } | { error: LadderVoteValidationError } {
  // 현재 UI는 draft 수정 기능을 사용하지 않아 DB 버전에서는 우선 미지원.
  // 필요해지면 PATCH /api/votes/[id]로 확장하세요.
  void id;
  void userId;
  void patch;
  return { error: { kind: "not_draft" } };
}

/** 투표 시작 — 작성자만, 초안 → 진행 중 */
export async function startLadderVote(
  id: string,
  userId: string,
): Promise<{ vote: LadderVoteRecord } | { error: LadderVoteValidationError }> {
  void userId; // 서버에서 auth로 검증
  try {
    await requestJson<{ ok: true }>(`/api/votes/${id}/start`, { method: "POST" });
    const vote = await fetchLadderVote(id);
    if (!vote) return { error: { kind: "not_found" } };
    return { vote };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 투표 중 선택지 추가 — 작성자만, 기존 항목·득표는 유지 */
export async function addLadderVoteOption(
  id: string,
  userId: string,
  label: string,
): Promise<{ vote: LadderVoteRecord } | { error: LadderVoteValidationError }> {
  void userId;
  try {
    await requestJson<{ option: { id: string; label: string } }>(
      `/api/votes/${id}/options`,
      { method: "POST", body: JSON.stringify({ label }) },
    );
    const vote = await fetchLadderVote(id);
    if (!vote) return { error: { kind: "not_found" } };
    return { vote };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 투표 종료 — 작성자만, 진행 중 → 종료 */
export async function endLadderVote(
  id: string,
  userId: string,
): Promise<{ vote: LadderVoteRecord } | { error: LadderVoteValidationError }> {
  void userId;
  try {
    await requestJson<{ ok: true }>(`/api/votes/${id}/end`, { method: "POST" });
    const vote = await fetchLadderVote(id);
    if (!vote) return { error: { kind: "not_found" } };
    return { vote };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 투표하기 / 수정 — 로그인 사용자, 진행 중 투표만 (이미 투표한 경우 선택지 변경) */
export async function castLadderVoteBallot(
  voteId: string,
  userId: string,
  voterName: string,
  optionId: string,
): Promise<{ vote: LadderVoteRecord } | { error: LadderVoteValidationError }> {
  if (!userId) return Promise.resolve({ error: { kind: "not_logged_in" } });
  try {
    await requestJson<{ ok: true }>(`/api/votes/${voteId}/ballots`, {
      method: "PUT",
      body: JSON.stringify({ optionId, voterName }),
    });
    const vote = await fetchLadderVote(voteId);
    if (!vote) return { error: { kind: "not_found" } };
    return { vote };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 작성자만 삭제 */
export async function deleteLadderVote(
  id: string,
  userId: string,
): Promise<{ ok: true } | { error: LadderVoteValidationError }> {
  void userId;
  try {
    await requestJson<{ ok: true }>(`/api/votes/${id}`, { method: "DELETE" });
    return { ok: true };
  } catch (e) {
    const error = e as ApiError;
    if (typeof error === "object" && error && "kind" in error) {
      return { error: error as LadderVoteValidationError };
    }
    return { error: { kind: "not_found" } };
  }
}

/** 사다리 삭제 시 연결 투표 일괄 제거 */
export function deleteVotesForLadderGame(ladderGameId: string): void {
  // 사다리 연동 투표 삭제 기능은 현재 DB 버전에서 사용하지 않습니다.
  void ladderGameId;
}

/** 투표 상세 조회 (DB) */
export async function fetchLadderVote(id: string): Promise<LadderVoteRecord | null> {
  try {
    const data = await requestJson<{ vote: LadderVoteRecord }>(`/api/votes/${id}`, {
      method: "GET",
    });
    return data.vote;
  } catch {
    return null;
  }
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
