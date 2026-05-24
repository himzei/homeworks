import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  applyClassPresidentToProfiles,
  applyClassRolesToProfiles,
  parseTeamCount,
  parseTeamLeadersFromBody,
  parseTeamMembersFromBodyRecord,
} from "@/lib/apply-class-roles";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type SaveClassRolesBody = {
  groupName?: string;
  /** true: 반장만 저장 (목록 페이지) */
  presidentOnly?: boolean;
  classPresidentId?: string | null;
  teamLeaders?: Record<string, string | null>;
  teamMembers?: Record<string, string[] | null>;
  teamCount?: number;
};

/**
 * PATCH: 과정별 반장 또는 반·조 전체 저장
 */
export async function PATCH(request: Request) {
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

    const body = (await request.json()) as SaveClassRolesBody;
    const groupName =
      typeof body.groupName === "string" ? body.groupName.trim() : "";

    if (!groupName) {
      return NextResponse.json(
        { error: "과정을 선택해 주세요." },
        { status: 400 },
      );
    }

    const db = getServiceRoleClient() ?? session.supabase!;

    if (body.presidentOnly) {
      const classPresidentId =
        typeof body.classPresidentId === "string" &&
        body.classPresidentId.trim()
          ? body.classPresidentId.trim()
          : null;

      const result = await applyClassPresidentToProfiles(
        db,
        groupName,
        classPresidentId,
      );

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return NextResponse.json({ ok: true });
    }

    const teamCount = parseTeamCount(body.teamCount);
    const classPresidentId =
      typeof body.classPresidentId === "string" && body.classPresidentId.trim()
        ? body.classPresidentId.trim()
        : null;
    const teamLeaders = parseTeamLeadersFromBody(body.teamLeaders, teamCount);
    const teamMembers = parseTeamMembersFromBodyRecord(
      body.teamMembers,
      teamCount,
    );

    const result = await applyClassRolesToProfiles(db, {
      groupName,
      classPresidentId,
      teamLeaders,
      teamMembers,
      teamCount,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/admin/class-roles:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
