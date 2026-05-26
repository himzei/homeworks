import { NextResponse } from "next/server";

import {
  assertTeamAttachmentFileSize,
  buildTeamAttachmentStorageFileName,
  isAllowedTeamAttachmentFileName,
  normalizeGithubUrl,
  parseTeamProjectsFromJson,
  TEAM_ATTACHMENT_HINT,
  teamProjectsMapToJson,
  type TeamProjectInfo,
} from "@/lib/class-role-team-projects";
import { verifyAdminSession } from "@/lib/admin/verify-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const TEAM_FILES_BUCKET = "class-role-team-files";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST: 조별 주제·GitHub·첨부파일 저장 (multipart/form-data)
 */
export async function POST(request: Request, context: RouteContext) {
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

    const formData = await request.formData();
    const teamNumberRaw = formData.get("teamNumber");
    const teamNumber =
      typeof teamNumberRaw === "string"
        ? Number.parseInt(teamNumberRaw, 10)
        : Number.NaN;

    if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 20) {
      return NextResponse.json(
        { error: "유효한 조 번호가 필요합니다." },
        { status: 400 },
      );
    }

    const topic =
      typeof formData.get("topic") === "string"
        ? formData.get("topic")!.toString().trim()
        : "";
    const githubUrl = normalizeGithubUrl(
      typeof formData.get("githubUrl") === "string"
        ? formData.get("githubUrl")!.toString()
        : "",
    );
    const removePpt = formData.get("removePpt") === "true";
    const pptFile = formData.get("pptFile");

    const { data: existing, error: fetchError } = await db
      .from("class_role_snapshots")
      .select("id, team_projects")
      .eq("id", snapshotId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const allProjects = parseTeamProjectsFromJson(existing.team_projects);
    const current: TeamProjectInfo = allProjects[teamNumber] ?? {
      topic: "",
      feedbackComments: [],
      githubUrl: "",
      pptStoragePath: null,
      pptFileName: null,
    };

    let pptStoragePath = current.pptStoragePath;
    let pptFileName = current.pptFileName;

    if (removePpt && pptStoragePath) {
      await db.storage.from(TEAM_FILES_BUCKET).remove([pptStoragePath]);
      pptStoragePath = null;
      pptFileName = null;
    }

    if (pptFile instanceof File && pptFile.size > 0) {
      const sizeError = assertTeamAttachmentFileSize(pptFile.size);
      if (sizeError) {
        return NextResponse.json({ error: sizeError }, { status: 400 });
      }
      if (!isAllowedTeamAttachmentFileName(pptFile.name)) {
        return NextResponse.json(
          {
            error: `허용되지 않는 파일 형식입니다. (${TEAM_ATTACHMENT_HINT})`,
          },
          { status: 400 },
        );
      }

      if (pptStoragePath) {
        await db.storage.from(TEAM_FILES_BUCKET).remove([pptStoragePath]);
      }

      const originalFileName = pptFile.name.trim() || "attachment";
      const storageFileName = buildTeamAttachmentStorageFileName(originalFileName);
      const storagePath = `${snapshotId}/${teamNumber}/${Date.now()}-${storageFileName}`;
      const buffer = Buffer.from(await pptFile.arrayBuffer());

      const { error: uploadError } = await db.storage
        .from(TEAM_FILES_BUCKET)
        .upload(storagePath, buffer, {
          contentType: pptFile.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("조 프로젝트 첨부파일 업로드:", uploadError);
        return NextResponse.json(
          { error: uploadError.message ?? "파일 업로드에 실패했습니다." },
          { status: 400 },
        );
      }

      pptStoragePath = storagePath;
      pptFileName = originalFileName;
    }

    allProjects[teamNumber] = {
      topic,
      feedbackComments: current.feedbackComments,
      githubUrl,
      pptStoragePath,
      pptFileName,
    };

    const { error: updateError } = await db
      .from("class_role_snapshots")
      .update({ team_projects: teamProjectsMapToJson(allProjects) })
      .eq("id", snapshotId);

    if (updateError) {
      console.error("team_projects 저장:", updateError);
      return NextResponse.json(
        { error: updateError.message ?? "저장에 실패했습니다." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      project: allProjects[teamNumber],
    });
  } catch (error) {
    console.error("POST team-project:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

/**
 * GET: 첨부파일 다운로드용 signed URL
 */
export async function GET(request: Request, context: RouteContext) {
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
    const { searchParams } = new URL(request.url);
    const teamNumber = Number.parseInt(searchParams.get("teamNumber") ?? "", 10);

    if (!Number.isFinite(teamNumber) || teamNumber < 1) {
      return NextResponse.json(
        { error: "조 번호가 필요합니다." },
        { status: 400 },
      );
    }

    const { data: row, error } = await db
      .from("class_role_snapshots")
      .select("team_projects")
      .eq("id", snapshotId)
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: "글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const projects = parseTeamProjectsFromJson(row.team_projects);
    const project = projects[teamNumber];
    const storagePath = project?.pptStoragePath;

    if (!storagePath) {
      return NextResponse.json(
        { error: "첨부된 파일이 없습니다." },
        { status: 404 },
      );
    }

    const { data: signed, error: signError } = await db.storage
      .from(TEAM_FILES_BUCKET)
      .createSignedUrl(storagePath, 60 * 10);

    if (signError || !signed?.signedUrl) {
      console.error("첨부파일 signed URL:", signError);
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
    console.error("GET team-project:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
