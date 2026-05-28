import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchClassRoleStudents } from "@/lib/class-officers";
import {
  toClassRoleSnapshotDetail,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import { extractCourseShortLabel } from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

import TeamProjectEditPageClient from "./team-project-edit-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string; teamNumber: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 관리자 - 조별 프로젝트 정보 입력/수정 페이지
 * - 기존 모달(TeamProjectEditDialog)을 페이지로 변경한 버전
 */
export default async function AdminTeamProjectEditPage({
  params,
  searchParams,
}: PageProps) {
  const { id: snapshotId, teamNumber: teamNumberParam } = await params;
  const queryParams = await searchParams;
  const returnTo =
    typeof queryParams.returnTo === "string" ? queryParams.returnTo : null;

  const teamNumber = Number.parseInt(teamNumberParam, 10);
  if (!Number.isFinite(teamNumber) || teamNumber < 1 || teamNumber > 20) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  const { data: record, error } = await supabase
    .from("class_role_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single();

  if (error || !record) {
    notFound();
  }

  const snapshot = toClassRoleSnapshotDetail(record as ClassRoleSnapshotRecord);
  const cohortLabel = extractCourseShortLabel(snapshot.groupName);
  const teamLabel = `${cohortLabel} ${teamNumber}조`;

  const students = await fetchClassRoleStudents(supabase, snapshot.groupName);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const leaderId = snapshot.teamLeaders[teamNumber];
  const memberIds = snapshot.teamMembers[teamNumber] ?? [];

  const teamMemberIds = [
    ...(leaderId ? [leaderId] : []),
    ...memberIds.filter((id) => id !== leaderId),
  ];

  const teamMembers = teamMemberIds.map((id) => ({
    id,
    name: studentById.get(id)?.name ?? "(알 수 없음)",
    // 한글 주석: 조장 여부 표시(평가표 상단에 구분용)
    isLeader: leaderId === id,
  }));

  const initialProject = snapshot.teamProjects[teamNumber] ?? null;
  const backHref = returnTo || `/admin/class-roles/${snapshotId}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={backHref}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            상세로
          </Button>
        </Link>
      </div>

      <TeamProjectEditPageClient
        snapshotId={snapshotId}
        teamNumber={teamNumber}
        teamLabel={teamLabel}
        initialProject={initialProject}
        teamMembers={teamMembers}
        backHref={backHref}
      />
    </div>
  );
}

