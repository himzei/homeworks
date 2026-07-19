import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  PEER_EVALUATION_STATUSES,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import { parsePeerEvaluationCriteriaInput } from "@/lib/peer-evaluation/criteria";
import {
  mapPeerEvaluationProjectRow,
  PEER_EVALUATION_PROJECT_SELECT,
} from "@/lib/peer-evaluation/map-project";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH: 상태/제목/설명/평가항목 수정
 * DELETE: 프로젝트 삭제 (평가 데이터 cascade)
 */
export async function PATCH(request: Request, context: RouteContext) {
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

    const body = (await request.json()) as {
      title?: unknown;
      description?: unknown;
      status?: unknown;
      criteria?: unknown;
    };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.title === "string") {
      const title = body.title.trim();
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
      updates.title = title;
    }

    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (typeof body.status === "string") {
      if (
        !PEER_EVALUATION_STATUSES.includes(
          body.status as PeerEvaluationStatus,
        )
      ) {
        return NextResponse.json(
          { error: "유효하지 않은 상태입니다." },
          { status: 400 },
        );
      }
      updates.status = body.status;
    }

    if (body.criteria !== undefined) {
      const criteriaResult = parsePeerEvaluationCriteriaInput(body.criteria);
      if (!criteriaResult.ok) {
        return NextResponse.json(
          { error: criteriaResult.error },
          { status: 400 },
        );
      }
      updates.criteria = criteriaResult.criteria;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "변경할 내용이 없습니다." },
        { status: 400 },
      );
    }

    const { data, error: updateError } = await supabase
      .from("peer_evaluation_projects")
      .update(updates)
      .eq("id", projectId)
      .select(PEER_EVALUATION_PROJECT_SELECT)
      .single();

    if (updateError || !data) {
      console.error("동료평가 프로젝트 수정 실패:", updateError);
      return NextResponse.json(
        { error: "프로젝트 수정에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      project: mapPeerEvaluationProjectRow(data),
    });
  } catch (err) {
    console.error("동료평가 프로젝트 수정 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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

    const { error: deleteError } = await supabase
      .from("peer_evaluation_projects")
      .delete()
      .eq("id", projectId);

    if (deleteError) {
      console.error("동료평가 프로젝트 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "프로젝트 삭제에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("동료평가 프로젝트 삭제 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
