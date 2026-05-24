import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  applyClassRolesToProfiles,
  fetchClassPresidentIdForGroup,
  parseTeamCount,
  parseTeamLeadersFromBody,
  parseTeamMembersFromBodyRecord,
  teamLeadersMapToJson,
  teamMembersMapToJson,
} from "@/lib/apply-class-roles";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type UpdateSnapshotBody = {
  title?: string;
  teamLeaders?: Record<string, string | null>;
  teamMembers?: Record<string, string[] | null>;
  teamCount?: number;
  applyToProfiles?: boolean;
};

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH: 조 편성 글 수정
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

    const { id } = await context.params;
    const body = (await request.json()) as UpdateSnapshotBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해 주세요." },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;

    const { data: existing, error: fetchError } = await db
      .from("class_role_snapshots")
      .select("id, group_name")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const teamCount = parseTeamCount(body.teamCount);
    const teamLeaders = parseTeamLeadersFromBody(body.teamLeaders, teamCount);
    const teamMembers = parseTeamMembersFromBodyRecord(
      body.teamMembers,
      teamCount,
    );
    const applyToProfiles = body.applyToProfiles !== false;
    const groupName = existing.group_name;
    const classPresidentId = await fetchClassPresidentIdForGroup(db, groupName);

    if (applyToProfiles) {
      const applyResult = await applyClassRolesToProfiles(db, {
        groupName,
        classPresidentId,
        teamLeaders,
        teamMembers,
        teamCount,
      });
      if (!applyResult.ok) {
        return NextResponse.json(
          { error: applyResult.error },
          { status: applyResult.status },
        );
      }

      await db
        .from("class_role_snapshots")
        .update({ is_active: false })
        .eq("group_name", groupName)
        .eq("is_active", true)
        .neq("id", id);
    }

    const updatePayload: Record<string, unknown> = {
      title,
      class_president_id: classPresidentId,
      team_leaders: teamLeadersMapToJson(teamLeaders),
      team_members: teamMembersMapToJson(teamMembers),
      team_count: teamCount,
    };
    if (applyToProfiles) {
      updatePayload.is_active = true;
    }

    const { error: updateError } = await db
      .from("class_role_snapshots")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("class-role-snapshots 수정:", updateError);
      return NextResponse.json(
        { error: updateError.message ?? "저장에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/class-role-snapshots/[id]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * DELETE: 반·조 게시판 글 삭제
 */
export async function DELETE(_request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const db = getServiceRoleClient() ?? session.supabase!;

    const { error } = await db
      .from("class_role_snapshots")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("class-role-snapshots 삭제:", error);
      return NextResponse.json(
        { error: error.message ?? "삭제에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/class-role-snapshots/[id]:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
