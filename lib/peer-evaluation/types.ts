import type { PeerEvaluationStatus } from "@/lib/peer-evaluation/constants";

/** 프로젝트에 설정된 평가항목 */
export type PeerEvaluationCriterion = {
  id: string;
  label: string;
  maxScore: number;
  sortOrder: number;
};

export type PeerEvaluationProject = {
  id: string;
  title: string;
  description: string | null;
  groupName: string;
  status: PeerEvaluationStatus;
  criteria: PeerEvaluationCriterion[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PeerEvaluationRating = {
  id: string;
  projectId: string;
  evaluatorId: string;
  evaluateeId: string;
  /** 항목 점수 평균(반올림) */
  score: number;
  criterionScores: Record<string, number>;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 관리자 결과: 피평가자별 집계 */
export type PeerEvaluationEvaluateeSummary = {
  evaluateeId: string;
  evaluateeName: string;
  ratingCount: number;
  averageScore: number | null;
  scores: number[];
  /** 항목별 평균 점수 */
  criterionAverages: Record<string, number | null>;
};

/** 관리자 결과: 개별 평가 행 */
export type PeerEvaluationRatingDetail = {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluateeId: string;
  evaluateeName: string;
  score: number;
  criterionScores: Record<string, number>;
  comment: string | null;
  createdAt: string;
};
