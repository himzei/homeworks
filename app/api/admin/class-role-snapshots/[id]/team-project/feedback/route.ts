import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  appendTeamProjectFeedbackComment,
  deleteTeamProjectFeedbackComment,
  parseTeamProjectsFromJson,
  teamProjectsMapToJson,
  updateTeamProjectFeedbackComment,
  type TeamProjectInfo,
} from "@/lib/class-role-team-projects";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

type FeedbackBody = {
  teamNumber?: number;
  content?: string;
  commentId?: string;
};

function parseTeamNumber(raw: unknown): number {
  return typeof raw === "number"
    ? raw
    : Number.parseInt(String(raw ?? ""), 10);
}

/** DELETE는 body가 비거나 파싱 실패하는 환경이 있어 쿼리·body 모두 지원 */
async function parseFeedbackDeleteInput(
  request: Request,
): Promise<{ teamNumber: number; commentId: string }> {
  const url = new URL(request.url);
  const teamFromQuery = parseTeamNumber(url.searchParams.get("teamNumber"));
  const commentFromQuery = url.searchParams.get("commentId")?.trim() ?? "";

  if (Number.isFinite(teamFromQuery) && commentFromQuery) {
    return { teamNumber: teamFromQuery, commentId: commentFromQuery };
  }

  try {
    const body = (await request.json()) as FeedbackBody;
    return {
      teamNumber: parseTeamNumber(body.teamNumber),
      commentId:
        typeof body.commentId === "string" ? body.commentId.trim() : "",
    };
  } catch {
    return { teamNumber: Number.NaN, commentId: "" };
  }
}

async function loadSnapshotProjects(db: SupabaseClient, snapshotId: string) {
  const { data: existing, error: fetchError } = await db
    .from("class_role_snapshots")
    .select("id, team_projects")
    .eq("id", snapshotId)
    .single();

  if (fetchError || !existing) {
    return { error: "글을 찾을 수 없습니다.", status: 404 as const };
  }

  return {
    allProjects: parseTeamProjectsFromJson(existing.team_projects),
  };
}

async function saveTeamProjects(
  db: SupabaseClient,
  snapshotId: string,
  allProjects: Record<number, TeamProjectInfo>,
  teamNumber: number,
) {
  const { error: updateError } = await db
    .from("class_role_snapshots")
    .update({ team_projects: teamProjectsMapToJson(allProjects) })
    .eq("id", snapshotId);

  if (updateError) {
    console.error("피드백 저장:", updateError);
    return {
      error: updateError.message ?? "저장에 실패했습니다.",
      status: 400 as const,
    };
  }

  return { project: allProjects[teamNumber] };
}

/**
 * POST: 조별 피드백 댓글 추가
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await verifyAdminSession();
    if (session.error || !session.user) {
      return NextResponse.json(
        { error: session.error ?? "로그인이 필요합니다." },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const { id: snapshotId } = await context.params;
    const body = (await request.json()) as FeedbackBody;

    const teamNumber = parseTeamNumber(body.teamNumber);
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 20) {
      return NextResponse.json(
        { error: "유효한 조 번호가 필요합니다." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "피드백 내용을 입력해 주세요." },
        { status: 400 },
      );
    }

    const loaded = await loadSnapshotProjects(db, snapshotId);
    if ("error" in loaded) {
      return NextResponse.json(
        { error: loaded.error },
        { status: loaded.status },
      );
    }

    const { data: authorProfile } = await db
      .from("profiles")
      .select("name")
      .eq("id", session.user.id)
      .single();

    const authorName = authorProfile?.name?.trim() || "관리자";
    const { allProjects } = loaded;

    const current: TeamProjectInfo = allProjects[teamNumber] ?? {
      topic: "",
      feedbackComments: [],
      githubUrl: "",
      pptStoragePath: null,
      pptFileName: null,
    };

    allProjects[teamNumber] = appendTeamProjectFeedbackComment(current, {
      content,
      authorId: session.user.id,
      authorName,
    });

    const saved = await saveTeamProjects(db, snapshotId, allProjects, teamNumber);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }

    return NextResponse.json({
      ok: true,
      project: saved.project,
    });
  } catch (error) {
    console.error("POST team-project/feedback:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * PATCH: 피드백 댓글 수정
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const { id: snapshotId } = await context.params;
    const body = (await request.json()) as FeedbackBody;

    const teamNumber = parseTeamNumber(body.teamNumber);
    const commentId =
      typeof body.commentId === "string" ? body.commentId.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 20) {
      return NextResponse.json(
        { error: "유효한 조 번호가 필요합니다." },
        { status: 400 },
      );
    }

    if (!commentId) {
      return NextResponse.json(
        { error: "댓글 ID가 필요합니다." },
        { status: 400 },
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "피드백 내용을 입력해 주세요." },
        { status: 400 },
      );
    }

    const loaded = await loadSnapshotProjects(db, snapshotId);
    if ("error" in loaded) {
      return NextResponse.json(
        { error: loaded.error },
        { status: loaded.status },
      );
    }

    const { allProjects } = loaded;
    const current: TeamProjectInfo = allProjects[teamNumber] ?? {
      topic: "",
      feedbackComments: [],
      githubUrl: "",
      pptStoragePath: null,
      pptFileName: null,
    };

    const updated = updateTeamProjectFeedbackComment(
      current,
      commentId,
      content,
    );
    if (!updated) {
      return NextResponse.json(
        { error: "피드백을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    allProjects[teamNumber] = updated;

    const saved = await saveTeamProjects(db, snapshotId, allProjects, teamNumber);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }

    return NextResponse.json({
      ok: true,
      project: saved.project,
    });
  } catch (error) {
    console.error("PATCH team-project/feedback:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * DELETE: 피드백 댓글 삭제
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await verifyAdminSession();
    if (session.error) {
      return NextResponse.json(
        { error: session.error },
        {
          status: session.error === "로그인이 필요합니다." ? 401 : 403,
        },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;
    const { id: snapshotId } = await context.params;
    const { teamNumber, commentId } = await parseFeedbackDeleteInput(request);

    if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 20) {
      return NextResponse.json(
        { error: "유효한 조 번호가 필요합니다." },
        { status: 400 },
      );
    }

    if (!commentId) {
      return NextResponse.json(
        { error: "댓글 ID가 필요합니다." },
        { status: 400 },
      );
    }

    const loaded = await loadSnapshotProjects(db, snapshotId);
    if ("error" in loaded) {
      return NextResponse.json(
        { error: loaded.error },
        { status: loaded.status },
      );
    }

    const { allProjects } = loaded;
    const current: TeamProjectInfo = allProjects[teamNumber] ?? {
      topic: "",
      feedbackComments: [],
      githubUrl: "",
      pptStoragePath: null,
      pptFileName: null,
    };

    const hasComment = current.feedbackComments.some(
      (comment) => comment.id === commentId,
    );
    if (!hasComment) {
      return NextResponse.json(
        { error: "피드백을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    allProjects[teamNumber] = deleteTeamProjectFeedbackComment(
      current,
      commentId,
    );

    const saved = await saveTeamProjects(db, snapshotId, allProjects, teamNumber);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }

    return NextResponse.json({
      ok: true,
      project: saved.project,
    });
  } catch (error) {
    console.error("DELETE team-project/feedback:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
