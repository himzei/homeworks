import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { fetchCohortFinalEvaluationData } from "@/lib/evaluation/fetch-cohort-final-evaluation-data";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_TEXT_LENGTH = 20000;

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/**
 * GET ?group=15기 — 기수별 최종 평가 목록(자동 점수 + 저장값)
 */
export async function GET(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const groupName = new URL(request.url).searchParams.get("group")?.trim();
    if (!groupName || groupName === "all") {
      return NextResponse.json(
        { error: "기수(과정)를 선택해 주세요." },
        { status: 400 },
      );
    }

    const rows = await fetchCohortFinalEvaluationData(
      session.supabase,
      groupName,
    );

    return NextResponse.json({ groupName, rows });
  } catch (error) {
    console.error("GET /api/admin/final-evaluations:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * POST — 학생 1명 최종 평가 저장
 * body: { groupName, studentId, consultationSummary?, professorFinalEvaluation? }
 */
export async function POST(request: Request) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        { status: session.error === "로그인이 필요합니다." ? 401 : 403 },
      );
    }

    const body = await request.json();
    const groupName =
      typeof body.groupName === "string" ? body.groupName.trim() : "";
    const studentId =
      typeof body.studentId === "string" ? body.studentId.trim() : "";

    if (!groupName || !studentId) {
      return NextResponse.json(
        { error: "기수와 학생 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const consultationSummary = normalizeText(
      body.consultationSummary,
      MAX_TEXT_LENGTH,
    );
    const professorFinalEvaluation = normalizeText(
      body.professorFinalEvaluation,
      MAX_TEXT_LENGTH,
    );

    const db = getServiceRoleClient() ?? session.supabase;
    if (!db) {
      return NextResponse.json(
        { error: "DB 연결에 실패했습니다." },
        { status: 500 },
      );
    }

    const { data, error } = await db
      .from("student_final_evaluations")
      .upsert(
        {
          group_name: groupName,
          student_id: studentId,
          consultation_summary: consultationSummary || null,
          professor_final_evaluation: professorFinalEvaluation,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "group_name,student_id" },
      )
      .select("updated_at")
      .single();

    if (error) {
      console.error("final-evaluations POST:", error);
      const message = error.message?.includes("student_final_evaluations")
        ? "student_final_evaluations 테이블이 없습니다. Supabase 마이그레이션을 적용해 주세요."
        : (error.message ?? "저장에 실패했습니다.");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    console.error("POST /api/admin/final-evaluations:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
