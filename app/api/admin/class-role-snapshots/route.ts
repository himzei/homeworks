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

type SaveSnapshotBody = {
  title?: string;
  groupName?: string;
  teamLeaders?: Record<string, string | null>;
  teamMembers?: Record<string, string[] | null>;
  teamCount?: number;
  applyToProfiles?: boolean;
};

/**
 * POST: 조 편성 글 작성 (조장·조원 + 목록의 반장 유지)
 */
export async function POST(request: Request) {
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

    const body = (await request.json()) as SaveSnapshotBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const groupName =
      typeof body.groupName === "string" ? body.groupName.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "제목을 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!groupName) {
      return NextResponse.json(
        { error: "과정을 선택해 주세요." },
        { status: 400 },
      );
    }

    const teamCount = parseTeamCount(body.teamCount);
    const teamLeaders = parseTeamLeadersFromBody(body.teamLeaders, teamCount);
    const teamMembers = parseTeamMembersFromBodyRecord(
      body.teamMembers,
      teamCount,
    );
    const applyToProfiles = body.applyToProfiles !== false;

    const db = getServiceRoleClient() ?? session.supabase!;

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
        .eq("is_active", true);
    }

    const { data: inserted, error: insertError } = await db
      .from("class_role_snapshots")
      .insert({
        title,
        group_name: groupName,
        class_president_id: classPresidentId,
        team_leaders: teamLeadersMapToJson(teamLeaders),
        team_members: teamMembersMapToJson(teamMembers),
        team_count: teamCount,
        is_active: applyToProfiles,
        created_by: session.user?.id ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("class-role-snapshots 작성:", insertError);
      return NextResponse.json(
        { error: insertError.message ?? "저장에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, id: inserted?.id });
  } catch (error) {
    console.error("POST /api/admin/class-role-snapshots:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
