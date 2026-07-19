/** 동료평가 점수 범위 (1~10점) */
export const PEER_EVALUATION_MIN_SCORE = 1;
export const PEER_EVALUATION_MAX_SCORE = 10;

export const PEER_EVALUATION_STATUSES = ["draft", "open", "closed"] as const;

export type PeerEvaluationStatus = (typeof PEER_EVALUATION_STATUSES)[number];

export const PEER_EVALUATION_STATUS_LABEL: Record<PeerEvaluationStatus, string> =
  {
    draft: "준비중",
    open: "진행중",
    closed: "종료",
  };

/** 점수 유효성 검사 */
export function isValidPeerEvaluationScore(score: unknown): score is number {
  return (
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= PEER_EVALUATION_MIN_SCORE &&
    score <= PEER_EVALUATION_MAX_SCORE
  );
}
