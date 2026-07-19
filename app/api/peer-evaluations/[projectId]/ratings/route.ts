import { NextResponse } from "next/server";

import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import {
  normalizeCriterionScores,
  normalizePeerEvaluationCriteria,
  parseCriterionScoresInput,
} from "@/lib/peer-evaluation/criteria";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

/**
 * GET: 현재 사용자가 이 프로젝트에서 제출한 평가만 반환
 * PUT: 동료 평가 upsert { evaluateeId, criterionScores, comment? }
 * DELETE: 본인 제출 취소 ?evaluateeId=
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { user } = await requireApprovedMember(supabase);
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("peer_evaluation_ratings")
      .select(
        "id, project_id, evaluator_id, evaluatee_id, score, criterion_scores, comment, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("evaluator_id", user.id);

    if (error) {
      console.error("동료평가 본인 제출 조회 실패:", error);
      return NextResponse.json(
        { error: "평가 목록을 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ratings: (data ?? []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        evaluatorId: row.evaluator_id,
        evaluateeId: row.evaluatee_id,
        score: row.score,
        criterionScores: normalizeCriterionScores(row.criterion_scores),
        comment: row.comment,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("동료평가 GET 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { user, profile } = await requireApprovedMember(supabase);
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const userGroupName = profile.group_name?.trim() || null;
    if (profile.role !== "admin" && !userGroupName) {
      return NextResponse.json(
        { error: "소속 기수가 없어 평가할 수 없습니다." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      evaluateeId?: unknown;
      criterionScores?: unknown;
      /** 레거시 단일 점수 — 항목이 1개일 때만 허용 */
      score?: unknown;
      comment?: unknown;
    };

    const evaluateeId =
      typeof body.evaluateeId === "string" ? body.evaluateeId.trim() : "";
    const comment =
      typeof body.comment === "string"
        ? body.comment.trim().slice(0, 500) || null
        : null;

    if (!evaluateeId) {
      return NextResponse.json(
        { error: "평가 대상이 필요합니다." },
        { status: 400 },
      );
    }
    if (evaluateeId === user.id) {
      return NextResponse.json(
        { error: "자기 자신은 평가할 수 없습니다." },
        { status: 400 },
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("peer_evaluation_projects")
      .select("id, group_name, status, criteria")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (project.status !== "open") {
      return NextResponse.json(
        { error: "진행 중인 프로젝트만 평가할 수 있습니다." },
        { status: 400 },
      );
    }
    if (profile.role !== "admin" && userGroupName !== project.group_name) {
      return NextResponse.json(
        { error: "다른 기수 프로젝트는 평가할 수 없습니다." },
        { status: 403 },
      );
    }

    const criteria = normalizePeerEvaluationCriteria(project.criteria);

    // criterionScores 우선, 없으면 단일 score를 첫 항목에 매핑
    let scoresInput = body.criterionScores;
    if (
      (scoresInput === undefined || scoresInput === null) &&
      body.score !== undefined &&
      criteria.length === 1
    ) {
      scoresInput = { [criteria[0].id]: body.score };
    }

    const parsedScores = parseCriterionScoresInput(scoresInput, criteria);
    if (!parsedScores.ok) {
      return NextResponse.json(
        { error: parsedScores.error },
        { status: 400 },
      );
    }

    const { data: evaluatee, error: evaluateeError } = await supabase
      .from("profiles")
      .select("id, group_name, role, approval_status, is_dormant")
      .eq("id", evaluateeId)
      .maybeSingle();

    if (evaluateeError || !evaluatee) {
      return NextResponse.json(
        { error: "평가 대상을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (
      evaluatee.role === "admin" ||
      evaluatee.approval_status !== "approved" ||
      evaluatee.is_dormant === true ||
      evaluatee.group_name !== project.group_name
    ) {
      return NextResponse.json(
        { error: "평가할 수 없는 대상입니다." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data, error: upsertError } = await supabase
      .from("peer_evaluation_ratings")
      .upsert(
        {
          project_id: projectId,
          evaluator_id: user.id,
          evaluatee_id: evaluateeId,
          score: parsedScores.overallScore,
          criterion_scores: parsedScores.scores,
          comment,
          updated_at: now,
        },
        { onConflict: "project_id,evaluator_id,evaluatee_id" },
      )
      .select(
        "id, project_id, evaluator_id, evaluatee_id, score, criterion_scores, comment, created_at, updated_at",
      )
      .single();

    if (upsertError || !data) {
      console.error("동료평가 제출 실패:", upsertError);
      return NextResponse.json(
        { error: "평가 저장에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      rating: {
        id: data.id,
        projectId: data.project_id,
        evaluatorId: data.evaluator_id,
        evaluateeId: data.evaluatee_id,
        score: data.score,
        criterionScores: normalizeCriterionScores(data.criterion_scores),
        comment: data.comment,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("동료평가 PUT 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { user, profile } = await requireApprovedMember(supabase);
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const evaluateeId = (searchParams.get("evaluateeId") ?? "").trim();

    if (!evaluateeId) {
      return NextResponse.json(
        { error: "평가 대상이 필요합니다." },
        { status: 400 },
      );
    }
    if (evaluateeId === user.id) {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("peer_evaluation_projects")
      .select("id, group_name, status")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    if (project.status !== "open") {
      return NextResponse.json(
        { error: "진행 중인 프로젝트에서만 제출을 취소할 수 있습니다." },
        { status: 400 },
      );
    }

    const userGroupName = profile.group_name?.trim() || null;
    if (profile.role !== "admin" && userGroupName !== project.group_name) {
      return NextResponse.json(
        { error: "다른 기수 프로젝트는 취소할 수 없습니다." },
        { status: 403 },
      );
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from("peer_evaluation_ratings")
      .delete()
      .eq("project_id", projectId)
      .eq("evaluator_id", user.id)
      .eq("evaluatee_id", evaluateeId)
      .select("id");

    if (deleteError) {
      console.error("동료평가 제출 취소 실패:", deleteError);
      return NextResponse.json(
        { error: "제출 취소에 실패했습니다." },
        { status: 500 },
      );
    }

    if (!deletedRows?.length) {
      return NextResponse.json(
        { error: "취소할 제출이 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, evaluateeId });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("동료평가 DELETE 예외:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
