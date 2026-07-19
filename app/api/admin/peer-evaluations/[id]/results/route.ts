import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { fetchPeerEvaluationAdminResults } from "@/lib/peer-evaluation/fetch-admin-results";
import {
  mapPeerEvaluationProjectRow,
  PEER_EVALUATION_PROJECT_SELECT,
} from "@/lib/peer-evaluation/map-project";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET: 관리자용 동료평가 결과 (폴링·실시간 갱신용) */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supabase, error } = await verifyAdminSession();
    if (error || !supabase) {
      return NextResponse.json(
        { error: error ?? "권한이 없습니다." },
        { status: error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const { id: projectId } = await context.params;
    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: projectRow, error: projectError } = await supabase
      .from("peer_evaluation_projects")
      .select(PEER_EVALUATION_PROJECT_SELECT)
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !projectRow) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const results = await fetchPeerEvaluationAdminResults(supabase, projectId);

    return NextResponse.json({
      project: mapPeerEvaluationProjectRow(projectRow),
      ...results,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("동료평가 결과 조회 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
