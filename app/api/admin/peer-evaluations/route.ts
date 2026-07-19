import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  PEER_EVALUATION_STATUSES,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import {
  DEFAULT_PEER_EVALUATION_CRITERIA,
  parsePeerEvaluationCriteriaInput,
} from "@/lib/peer-evaluation/criteria";
import {
  mapPeerEvaluationProjectRow,
  PEER_EVALUATION_PROJECT_SELECT,
} from "@/lib/peer-evaluation/map-project";

/**
 * POST: 동료평가 프로젝트 생성
 * body: { title, description?, groupName, status?, criteria? }
 */
export async function POST(request: Request) {
  try {
    const { supabase, user, error } = await verifyAdminSession();
    if (error || !supabase || !user) {
      return NextResponse.json(
        { error: error ?? "권한이 없습니다." },
        { status: error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      groupName?: unknown;
      status?: unknown;
      criteria?: unknown;
    };

    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const groupName =
      typeof body.groupName === "string" ? body.groupName.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;

    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해 주세요." },
        { status: 400 },
      );
    }
    if (title.length > 120) {
      return NextResponse.json(
        { error: "제목은 120자 이내로 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!groupName) {
      return NextResponse.json(
        { error: "과정을 선택해 주세요." },
        { status: 400 },
      );
    }

    const criteriaResult = parsePeerEvaluationCriteriaInput(
      body.criteria ?? DEFAULT_PEER_EVALUATION_CRITERIA,
    );
    if (!criteriaResult.ok) {
      return NextResponse.json(
        { error: criteriaResult.error },
        { status: 400 },
      );
    }

    let status: PeerEvaluationStatus = "draft";
    if (
      typeof body.status === "string" &&
      PEER_EVALUATION_STATUSES.includes(body.status as PeerEvaluationStatus)
    ) {
      status = body.status as PeerEvaluationStatus;
    }

    const now = new Date().toISOString();
    const { data, error: insertError } = await supabase
      .from("peer_evaluation_projects")
      .insert({
        title,
        description,
        group_name: groupName,
        status,
        criteria: criteriaResult.criteria,
        created_by: user.id,
        updated_at: now,
      })
      .select(PEER_EVALUATION_PROJECT_SELECT)
      .single();

    if (insertError || !data) {
      console.error("동료평가 프로젝트 생성 실패:", insertError);
      return NextResponse.json(
        { error: "프로젝트 생성에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      project: mapPeerEvaluationProjectRow(data),
    });
  } catch (err) {
    console.error("동료평가 프로젝트 생성 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
