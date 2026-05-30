import { NextResponse } from "next/server";

import {
  parseTeamLeadersFromJson,
  parseTeamMembersFromJson,
} from "@/lib/apply-class-roles";
import { parseTeamProjectsFromJson } from "@/lib/class-role-team-projects";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const TEAM_FILES_BUCKET = "class-role-team-files";

function userBelongsToTeamInSnapshot(
  userId: string,
  teamNumber: number,
  teamLeaders: Record<string, string | null> | null,
  teamMembers: Record<string, string[] | null> | null,
  teamCount: number,
): boolean {
  const leaders = parseTeamLeadersFromJson(teamLeaders, teamCount);
  if (leaders.get(teamNumber) === userId) {
    return true;
  }

  const members = parseTeamMembersFromJson(teamMembers, teamCount);
  return (members.get(teamNumber) ?? []).includes(userId);
}

/**
 * GET: 학습현황 — 내 팀 프로젝트 첨부파일 signed URL
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get("snapshotId")?.trim();
    const teamNumber = Number.parseInt(searchParams.get("teamNumber") ?? "", 10);

    if (!snapshotId) {
      return NextResponse.json({ error: "글 ID가 필요합니다." }, { status: 400 });
    }

    if (!Number.isFinite(teamNumber) || teamNumber < 1) {
      return NextResponse.json({ error: "조 번호가 필요합니다." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("group_name, role, approval_status, is_dormant")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.group_name?.trim()) {
      return NextResponse.json({ error: "프로필을 확인할 수 없습니다." }, { status: 403 });
    }

    const db = getServiceRoleClient() ?? supabase;

    const { data: snapshot, error: snapshotError } = await db
      .from("class_role_snapshots")
      .select(
        "id, group_name, team_count, team_leaders, team_members, team_projects, is_active",
      )
      .eq("id", snapshotId)
      .maybeSingle();

    if (snapshotError || !snapshot) {
      return NextResponse.json({ error: "조 편성 글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (snapshot.group_name?.trim() !== profile.group_name.trim()) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    const teamCount =
      typeof snapshot.team_count === "number" ? snapshot.team_count : 0;

    if (
      profile.role !== "admin" &&
      !userBelongsToTeamInSnapshot(
        user.id,
        teamNumber,
        snapshot.team_leaders,
        snapshot.team_members,
        teamCount,
      )
    ) {
      return NextResponse.json(
        { error: "해당 조의 첨부파일만 다운로드할 수 있습니다." },
        { status: 403 },
      );
    }

    const projects = parseTeamProjectsFromJson(snapshot.team_projects);
    const project = projects[teamNumber];
    const storagePath = project?.pptStoragePath;

    if (!storagePath) {
      return NextResponse.json({ error: "첨부된 파일이 없습니다." }, { status: 404 });
    }

    const { data: signed, error: signError } = await db.storage
      .from(TEAM_FILES_BUCKET)
      .createSignedUrl(storagePath, 60 * 10);

    if (signError || !signed?.signedUrl) {
      console.error("학습현황 첨부파일 signed URL:", signError);
      return NextResponse.json(
        { error: "파일 URL 생성에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: signed.signedUrl,
      fileName: project.pptFileName ?? "attachment",
    });
  } catch (error) {
    console.error("GET learning-status team-project-attachment:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
