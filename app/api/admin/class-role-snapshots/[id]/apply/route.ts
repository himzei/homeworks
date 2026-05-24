import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  applyClassRolesToProfiles,
  parseTeamLeadersFromJson,
  parseTeamMembersFromJson,
} from "@/lib/apply-class-roles";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST: 과거 반·조 편성 글을 다시 적용 (글에 저장된 반장·조 함께 반영)
 */
export async function POST(_request: Request, context: RouteContext) {
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

    const { data: snapshot, error: fetchError } = await db
      .from("class_role_snapshots")
      .select(
        "id, group_name, class_president_id, team_leaders, team_members, team_count",
      )
      .eq("id", id)
      .single();

    if (fetchError || !snapshot) {
      return NextResponse.json(
        { error: "글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const teamLeaders = parseTeamLeadersFromJson(
      snapshot.team_leaders as Record<string, string> | null,
      snapshot.team_count,
    );
    const teamMembers = parseTeamMembersFromJson(
      snapshot.team_members as Record<string, string[]> | null,
      snapshot.team_count,
    );

    if (!snapshot.class_president_id) {
      return NextResponse.json(
        { error: "이 글에는 반장 정보가 없습니다. 글을 수정해 반장을 지정해 주세요." },
        { status: 400 },
      );
    }

    const applyResult = await applyClassRolesToProfiles(db, {
      groupName: snapshot.group_name,
      classPresidentId: snapshot.class_president_id,
      teamLeaders,
      teamMembers,
      teamCount: snapshot.team_count,
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
      .eq("group_name", snapshot.group_name)
      .eq("is_active", true);

    await db
      .from("class_role_snapshots")
      .update({ is_active: true })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/class-role-snapshots/[id]/apply:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
