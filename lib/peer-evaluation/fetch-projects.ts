import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapPeerEvaluationProjectRow,
  PEER_EVALUATION_PROJECT_SELECT,
} from "@/lib/peer-evaluation/map-project";
import type { PeerEvaluationProject } from "@/lib/peer-evaluation/types";

/** 관리자: 기수별(또는 전체) 프로젝트 목록 */
export async function fetchPeerEvaluationProjectsForAdmin(
  supabase: SupabaseClient,
  groupName: string | null,
): Promise<PeerEvaluationProject[]> {
  let query = supabase
    .from("peer_evaluation_projects")
    .select(PEER_EVALUATION_PROJECT_SELECT)
    .order("created_at", { ascending: false });

  if (groupName) {
    query = query.eq("group_name", groupName);
  }

  const { data, error } = await query;
  if (error) {
    console.error("동료평가 프로젝트 조회 실패:", error);
    return [];
  }

  return (data ?? []).map(mapPeerEvaluationProjectRow);
}

/** 학생: 본인 기수의 open/closed 프로젝트 (RLS로 범위 제한) */
export async function fetchPeerEvaluationProjectsForMember(
  supabase: SupabaseClient,
  groupName: string,
): Promise<PeerEvaluationProject[]> {
  const { data, error } = await supabase
    .from("peer_evaluation_projects")
    .select(PEER_EVALUATION_PROJECT_SELECT)
    .eq("group_name", groupName)
    .in("status", ["open", "closed"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("동료평가 프로젝트(회원) 조회 실패:", error);
    return [];
  }

  return (data ?? []).map(mapPeerEvaluationProjectRow);
}

/** 단일 프로젝트 조회 */
export async function fetchPeerEvaluationProjectById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<PeerEvaluationProject | null> {
  const { data, error } = await supabase
    .from("peer_evaluation_projects")
    .select(PEER_EVALUATION_PROJECT_SELECT)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("동료평가 프로젝트 단건 조회 실패:", error);
    return null;
  }
  if (!data) return null;

  return mapPeerEvaluationProjectRow(data);
}
