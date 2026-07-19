import {
  PEER_EVALUATION_MAX_SCORE,
  PEER_EVALUATION_MIN_SCORE,
  isValidPeerEvaluationScore,
} from "@/lib/peer-evaluation/constants";
import type { PeerEvaluationCriterion } from "@/lib/peer-evaluation/types";

export const PEER_EVALUATION_MIN_CRITERIA = 1;
export const PEER_EVALUATION_MAX_CRITERIA = 10;

/** 생성 폼 기본 평가항목 */
export const DEFAULT_PEER_EVALUATION_CRITERIA: PeerEvaluationCriterion[] = [
  { id: "participation", label: "참여도", maxScore: 10, sortOrder: 0 },
  { id: "contribution", label: "기여도", maxScore: 10, sortOrder: 1 },
  { id: "collaboration", label: "협업", maxScore: 10, sortOrder: 2 },
  { id: "expertise", label: "전문성", maxScore: 10, sortOrder: 3 },
  { id: "responsibility", label: "책임감", maxScore: 10, sortOrder: 4 },
];

/** 레거시(항목 없음) 폴백 */
export const FALLBACK_PEER_EVALUATION_CRITERIA: PeerEvaluationCriterion[] = [
  { id: "overall", label: "종합", maxScore: 10, sortOrder: 0 },
];

function createCriterionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyPeerEvaluationCriterion(
  sortOrder: number,
): PeerEvaluationCriterion {
  return {
    id: createCriterionId(),
    label: "",
    maxScore: PEER_EVALUATION_MAX_SCORE,
    sortOrder,
  };
}

/** DB/클라이언트 값을 정규화된 평가항목 배열로 변환 */
export function normalizePeerEvaluationCriteria(
  value: unknown,
): PeerEvaluationCriterion[] {
  if (!Array.isArray(value) || value.length === 0) {
    return FALLBACK_PEER_EVALUATION_CRITERIA.map((item) => ({ ...item }));
  }

  const normalized: PeerEvaluationCriterion[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") continue;

    const row = raw as Record<string, unknown>;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : createCriterionId();
    const label =
      typeof row.label === "string" ? row.label.trim() : "";
    const maxScoreRaw =
      typeof row.maxScore === "number"
        ? row.maxScore
        : typeof row.max_score === "number"
          ? row.max_score
          : PEER_EVALUATION_MAX_SCORE;
    const maxScore = Number.isInteger(maxScoreRaw)
      ? maxScoreRaw
      : PEER_EVALUATION_MAX_SCORE;

    if (!label) continue;

    normalized.push({
      id,
      label: label.slice(0, 40),
      maxScore: Math.min(
        PEER_EVALUATION_MAX_SCORE,
        Math.max(PEER_EVALUATION_MIN_SCORE, maxScore),
      ),
      sortOrder:
        typeof row.sortOrder === "number"
          ? row.sortOrder
          : typeof row.sort_order === "number"
            ? row.sort_order
            : index,
    });
  }

  if (normalized.length === 0) {
    return FALLBACK_PEER_EVALUATION_CRITERIA.map((item) => ({ ...item }));
  }

  return normalized
    .toSorted((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

/** 관리자 입력 검증 — 성공 시 정규화된 배열, 실패 시 에러 문구 */
export function parsePeerEvaluationCriteriaInput(
  value: unknown,
): { ok: true; criteria: PeerEvaluationCriterion[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "평가항목 형식이 올바르지 않습니다." };
  }

  if (
    value.length < PEER_EVALUATION_MIN_CRITERIA ||
    value.length > PEER_EVALUATION_MAX_CRITERIA
  ) {
    return {
      ok: false,
      error: `평가항목은 ${PEER_EVALUATION_MIN_CRITERIA}~${PEER_EVALUATION_MAX_CRITERIA}개여야 합니다.`,
    };
  }

  const seenIds = new Set<string>();
  const criteria: PeerEvaluationCriterion[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "평가항목 형식이 올바르지 않습니다." };
    }

    const row = raw as Record<string, unknown>;
    const label =
      typeof row.label === "string" ? row.label.trim() : "";
    if (!label) {
      return {
        ok: false,
        error: `${index + 1}번째 평가항목 이름을 입력해 주세요.`,
      };
    }
    if (label.length > 40) {
      return {
        ok: false,
        error: "평가항목 이름은 40자 이내로 입력해 주세요.",
      };
    }

    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : createCriterionId();
    if (seenIds.has(id)) {
      return { ok: false, error: "평가항목 ID가 중복되었습니다." };
    }
    seenIds.add(id);

    const maxScoreRaw =
      typeof row.maxScore === "number"
        ? row.maxScore
        : typeof row.maxScore === "string"
          ? Number(row.maxScore)
          : PEER_EVALUATION_MAX_SCORE;

    if (
      !Number.isInteger(maxScoreRaw) ||
      maxScoreRaw < PEER_EVALUATION_MIN_SCORE ||
      maxScoreRaw > PEER_EVALUATION_MAX_SCORE
    ) {
      return {
        ok: false,
        error: `"${label}" 최고점은 ${PEER_EVALUATION_MIN_SCORE}~${PEER_EVALUATION_MAX_SCORE} 정수여야 합니다.`,
      };
    }

    criteria.push({
      id,
      label,
      maxScore: maxScoreRaw,
      sortOrder: index,
    });
  }

  return { ok: true, criteria };
}

/** 항목별 점수가 프로젝트 기준과 일치하는지 검증 */
export function parseCriterionScoresInput(
  value: unknown,
  criteria: PeerEvaluationCriterion[],
):
  | { ok: true; scores: Record<string, number>; overallScore: number }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "항목별 점수 형식이 올바르지 않습니다." };
  }

  const rawScores = value as Record<string, unknown>;
  const scores: Record<string, number> = {};

  for (const criterion of criteria) {
    const raw = rawScores[criterion.id];
    const score =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;

    if (
      !Number.isInteger(score) ||
      score < PEER_EVALUATION_MIN_SCORE ||
      score > criterion.maxScore
    ) {
      return {
        ok: false,
        error: `"${criterion.label}" 점수는 1~${criterion.maxScore} 정수여야 합니다.`,
      };
    }

    scores[criterion.id] = score;
  }

  const values = criteria.map((criterion) => scores[criterion.id]);
  const average =
    values.reduce((sum, score) => sum + score, 0) / values.length;
  const overallScore = Math.round(average);

  if (!isValidPeerEvaluationScore(overallScore)) {
    return { ok: false, error: "종합 점수 계산에 실패했습니다." };
  }

  return { ok: true, scores, overallScore };
}

/** DB JSON → 항목별 점수 맵 */
export function normalizeCriterionScores(
  value: unknown,
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const score =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(score)) {
      result[key] = score;
    }
  }
  return result;
}
