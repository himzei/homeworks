import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  CLASS_OFFICER_ROLE,
  fetchClassRoleStudents,
} from "@/lib/class-officers";
import {
  toClassRoleSnapshotDetail,
  type ClassRoleSnapshotRecord,
} from "@/lib/class-role-snapshots";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import { extractCourseShortLabel } from "@/lib/courses";
import { Button } from "@/app/_components/ui/button";

import ApplyClassRoleSnapshotButton from "../../_components/ApplyClassRoleSnapshotButton";
import ClassRoleSnapshotDetailArticle, {
  type ClassRoleSnapshotTeam,
} from "../../_components/ClassRoleSnapshotDetailArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_role_snapshots")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: data?.title ? `${data.title} · 반·조` : "반·조 상세",
  };
}

/**
 * 관리자 - 반·조 게시판 상세
 */
export default async function AdminClassRoleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const queryParams = await searchParams;
  const selectedGroupParam = (queryParams?.group as string) || null;
  const filterGroup =
    selectedGroupParam && selectedGroupParam !== "all"
      ? selectedGroupParam
      : null;

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
    .eq("id", id)
    .single();

  if (error || !record) {
    notFound();
  }

  const snapshot = toClassRoleSnapshotDetail(
    record as ClassRoleSnapshotRecord,
  );

  const students = await fetchClassRoleStudents(supabase, snapshot.groupName);
  const studentById = new Map(students.map((s) => [s.id, s]));

  const honorBadgeLabelsByProfileId = await fetchHonorBadgeLabelsByProfileId(
    supabase,
    students.map((s) => s.id),
  );

  const president = snapshot.classPresidentId
    ? studentById.get(snapshot.classPresidentId)
    : null;

  const cohortLabel = extractCourseShortLabel(snapshot.groupName);

  const teams: ClassRoleSnapshotTeam[] = Array.from(
    { length: snapshot.teamCount },
    (_, index) => {
      const teamNumber = index + 1;
      const leaderId = snapshot.teamLeaders[teamNumber];
      const leader = leaderId ? studentById.get(leaderId) : null;
      const memberIds = snapshot.teamMembers[teamNumber] ?? [];

      const members = memberIds
        .filter((memberId) => memberId !== leaderId)
        .map((memberId) => {
          const student = studentById.get(memberId);
          const isPresident = memberId === snapshot.classPresidentId;
          return {
            name: student?.name ?? "(알 수 없음)",
            classOfficerRole: isPresident
              ? CLASS_OFFICER_ROLE.CLASS_PRESIDENT
              : null,
            teamNumber,
            honorBadgeLabels: honorBadgeLabelsByProfileId[memberId] ?? [],
          };
        });

      const leaderIsPresident = leaderId === snapshot.classPresidentId;

      return {
        teamNumber,
        leaderName: leader?.name ?? (leaderId ? "(알 수 없음)" : null),
        leaderRole: leaderIsPresident
          ? CLASS_OFFICER_ROLE.CLASS_PRESIDENT
          : leader
            ? CLASS_OFFICER_ROLE.TEAM_LEADER
            : null,
        leaderIsTeamLeader: leaderIsPresident,
        leaderHonorBadgeLabels: leaderId
          ? (honorBadgeLabelsByProfileId[leaderId] ?? [])
          : [],
        members,
      };
    },
  );

  const listHref = filterGroup
    ? `/admin/class-roles?group=${encodeURIComponent(filterGroup)}`
    : `/admin/class-roles?group=${encodeURIComponent(snapshot.groupName)}`;

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : `?group=${encodeURIComponent(snapshot.groupName)}`;

  const editHref = `/admin/class-roles/${id}/edit${groupQuery}`;

  const createdAtLabel = dateFormatter.format(new Date(snapshot.createdAt));

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href={listHref}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            목록
          </Button>
        </Link>
        {!snapshot.isActive ? (
          <ApplyClassRoleSnapshotButton
            snapshotId={id}
            title={snapshot.title}
          />
        ) : null}
        <Link href={editHref}>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <PencilLine className="size-4" />
            수정
          </Button>
        </Link>
      </div>

      <ClassRoleSnapshotDetailArticle
          title={snapshot.title}
          cohortLabel={cohortLabel}
          groupName={snapshot.groupName}
          createdAtLabel={createdAtLabel}
          createdAtIso={snapshot.createdAt}
          isActive={snapshot.isActive}
          presidentName={president?.name ?? null}
          presidentHonorBadgeLabels={
            snapshot.classPresidentId
              ? (honorBadgeLabelsByProfileId[snapshot.classPresidentId] ?? [])
              : []
          }
          teamCount={snapshot.teamCount}
          teams={teams}
        />
    </>
  );
}
