import { NextResponse } from "next/server";

import { verifyAdminSession } from "@/lib/admin/verify-admin";
import {
  applyHonorBadgeSectionsForGroup,
  fetchHonorBadgeSectionsForGroup,
  type HonorBadgeSectionSaveItem,
} from "@/lib/honor-badges";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

type PutHonorBadgesBody = {
  groupName?: string;
  sections?: HonorBadgeSectionSaveItem[];
};

/**
 * PUT: 과정별 명예 배지 섹션·배지·학생 부여 일괄 저장
 */
export async function PUT(request: Request) {
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

    const body = (await request.json()) as PutHonorBadgesBody;
    const groupName =
      typeof body.groupName === "string" ? body.groupName.trim() : "";

    if (!groupName) {
      return NextResponse.json(
        { error: "과정을 선택해 주세요." },
        { status: 400 },
      );
    }

    const sections = Array.isArray(body.sections) ? body.sections : [];

    const db = getServiceRoleClient() ?? session.supabase!;

    const { data: students, error: studentsError } = await db
      .from("profiles")
      .select("id")
      .eq("group_name", groupName)
      .neq("role", "admin");

    if (studentsError) {
      console.error("과정 학생 조회:", studentsError);
      return NextResponse.json(
        { error: "학생 목록을 불러오지 못했습니다." },
        { status: 500 },
      );
    }

    const validStudentIds = new Set((students ?? []).map((s) => s.id));

    const result = await applyHonorBadgeSectionsForGroup(
      db,
      groupName,
      sections,
      validStudentIds,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const saved = await fetchHonorBadgeSectionsForGroup(db, groupName);
    return NextResponse.json({ ok: true, sections: saved });
  } catch (error) {
    console.error("PUT /api/admin/honor-badges:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
