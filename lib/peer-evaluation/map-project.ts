import type { PeerEvaluationStatus } from "@/lib/peer-evaluation/constants";
import { PEER_EVALUATION_STATUSES } from "@/lib/peer-evaluation/constants";
import { normalizePeerEvaluationCriteria } from "@/lib/peer-evaluation/criteria";
import type { PeerEvaluationProject } from "@/lib/peer-evaluation/types";

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  group_name: string;
  status: string;
  criteria?: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const PEER_EVALUATION_PROJECT_SELECT =
  "id, title, description, group_name, status, criteria, created_by, created_at, updated_at";

function parseStatus(value: string): PeerEvaluationStatus {
  if (PEER_EVALUATION_STATUSES.includes(value as PeerEvaluationStatus)) {
    return value as PeerEvaluationStatus;
  }
  return "draft";
}

/** DB 행 → 앱 타입 */
export function mapPeerEvaluationProjectRow(
  row: ProjectRow,
): PeerEvaluationProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    groupName: row.group_name,
    status: parseStatus(row.status),
    criteria: normalizePeerEvaluationCriteria(row.criteria),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
