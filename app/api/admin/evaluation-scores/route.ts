import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  parseExamLetterGrade,
  scoreFromExamLetterGrade,
  type ExamLetterGrade,
} from "@/lib/evaluation/exam-letter-grade";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_COMMENT_LENGTH = 2000;

/**
 * POST: 추가 필드 점수·등급·코멘트 저장(upsert)
 * body: { userId, fieldId, score?, grade?, comment? }
 * - score / grade / comment 중 하나 이상 필요
 * - grade 저장 시 score는 등급 환산값으로 동기화
 * - 일부만 보내면 기존 값은 유지한 채 해당 필드만 갱신
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
    const { userId, fieldId, score, grade, comment } = body as {
      userId?: string;
      fieldId?: string;
      score?: number;
      grade?: string | null;
      comment?: string | null;
    };

    if (typeof userId !== "string" || typeof fieldId !== "string") {
      return NextResponse.json({ error: "필수 항목이 없습니다." }, { status: 400 });
    }

    const hasScore = score !== undefined && score !== null;
    const hasGrade = grade !== undefined;
    const hasComment = comment !== undefined;

    if (!hasScore && !hasGrade && !hasComment) {
      return NextResponse.json(
        { error: "점수, 등급 또는 코멘트가 필요합니다." },
        { status: 400 },
      );
    }

    let parsedGrade: ExamLetterGrade | null | undefined;
    if (hasGrade) {
      if (grade === null || grade === "") {
        parsedGrade = null;
      } else {
        const normalized = parseExamLetterGrade(grade);
        if (!normalized) {
          return NextResponse.json(
            { error: "등급은 A, B, C, D, F 중 하나여야 합니다." },
            { status: 400 },
          );
        }
        parsedGrade = normalized;
      }
    }

    let parsedScore: number | undefined;
    if (hasScore) {
      parsedScore =
        typeof score === "number" && Number.isFinite(score)
          ? Math.round(score)
          : Number.parseInt(String(score ?? ""), 10);

      if (
        !Number.isFinite(parsedScore) ||
        parsedScore < 0 ||
        parsedScore > 999
      ) {
        return NextResponse.json(
          { error: "점수는 0~999 사이의 숫자여야 합니다." },
          { status: 400 },
        );
      }
    }

    // 등급 선택 시에만 환산 점수로 동기화 (등급 해제는 점수 유지)
    if (parsedGrade !== undefined && parsedGrade !== null) {
      parsedScore = scoreFromExamLetterGrade(parsedGrade);
    }

    const normalizedComment = hasComment
      ? typeof comment === "string"
        ? comment.trim().slice(0, MAX_COMMENT_LENGTH) || null
        : null
      : undefined;

    const db = getServiceRoleClient() ?? session.supabase;
    if (!db) {
      return NextResponse.json({ error: "DB 연결에 실패했습니다." }, { status: 500 });
    }

    // 일부 필드만 갱신할 때 기존 값 유지
    const { data: existingRow, error: existingError } = await db
      .from("evaluation_extra_scores")
      .select("score, comment, grade")
      .eq("field_id", fieldId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("evaluation-scores 기존 행 조회:", existingError);
      const message = existingError.message?.includes("grade")
        ? "grade 컬럼이 없습니다. Supabase 마이그레이션을 적용해 주세요."
        : (existingError.message ?? "기존 점수 조회에 실패했습니다.");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const nextScore = parsedScore ?? existingRow?.score ?? 0;
    const nextComment =
      normalizedComment !== undefined
        ? normalizedComment
        : ((existingRow?.comment as string | null | undefined) ?? null);
    const nextGrade =
      parsedGrade !== undefined
        ? parsedGrade
        : parseExamLetterGrade(existingRow?.grade);

    const { error: upsertError } = await db.from("evaluation_extra_scores").upsert(
      {
        user_id: userId,
        field_id: fieldId,
        score: nextScore,
        comment: nextComment,
        grade: nextGrade,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "field_id,user_id" },
    );

    if (upsertError) {
      console.error("evaluation-scores POST:", upsertError);
      const message = upsertError.message?.includes("grade")
        ? "grade 컬럼이 없습니다. Supabase 마이그레이션을 적용해 주세요."
        : upsertError.message?.includes("comment")
          ? "comment 컬럼이 없습니다. Supabase 마이그레이션을 적용해 주세요."
          : (upsertError.message ?? "점수 저장에 실패했습니다.");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      score: nextScore,
      comment: nextComment,
      grade: nextGrade,
    });
  } catch (e) {
    console.error("POST /api/admin/evaluation-scores:", e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
