import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  fetchProfileIdsByNames,
  fetchSeatingStudents,
} from "@/lib/fetch-group-students";
import { fetchClassPresidentIdForGroup } from "@/lib/apply-class-roles";
import {
  applyTeamBadgeVisibility,
  buildOfficerInfoByStudentName,
  ensureClassPresidentInOfficerByStudentName,
  fetchClassRoleStudents,
  fetchOfficersByStudentNames,
  mergeHonorBadgesIntoOfficerByStudentName,
} from "@/lib/class-officers";
import { isGroupTeamAssignmentActive } from "@/lib/class-role-snapshots";
import { fetchHonorBadgeLabelsByProfileId } from "@/lib/honor-badges";
import {
  buildAvatarUrlByName,
  buildProfileIdByName,
  countAssignedSeats,
  getAssignedStudentNames,
  getOfficerSnapshotFromRecord,
  type SeatingChartRecord,
} from "@/lib/seating";
import { Button } from "@/app/_components/ui/button";

import SeatingChartDetailArticle from "../../_components/SeatingChartDetailArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** 작성일 포매터 (날짜만 표시) */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: chart } = await supabase
    .from("seating_charts")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: chart?.title ? `${chart.title} · 자리배치도` : "자리배치도",
  };
}

/**
 * 관리자 - 자리배치도 상세 페이지
 */
export default async function AdminSeatingDetailPage({
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
    redirect("/login?login_required=1");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/home");
  }

  const { data: chart, error } = await supabase
    .from("seating_charts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !chart) {
    notFound();
  }

  const record = chart as SeatingChartRecord;
  const seatAssignments = record.seat_assignments ?? {};
  const assignedCount = countAssignedSeats(seatAssignments);
  const totalSeats = record.row_count * record.col_count;

  const listHref = filterGroup
    ? `/admin/seating?group=${encodeURIComponent(filterGroup)}`
    : "/admin/seating";

  const groupQuery = filterGroup
    ? `?group=${encodeURIComponent(filterGroup)}`
    : "";

  const editHref = `/admin/seating/${id}/edit${groupQuery}`;
  const createdAtLabel = dateFormatter.format(new Date(record.created_at));

  // 이름 → 프로필 id·이미지 (상세보기 링크·좌석 원)
  const seatingStudents = record.group_name
    ? await fetchSeatingStudents(supabase, record.group_name)
    : await fetchProfileIdsByNames(
        supabase,
        getAssignedStudentNames(seatAssignments),
      );
  const profileIdByName = buildProfileIdByName(seatingStudents);
  const avatarUrlByName = buildAvatarUrlByName(seatingStudents);

  const roleStudents = record.group_name
    ? await fetchClassRoleStudents(supabase, record.group_name)
    : [];

  const honorLabelsByProfileId =
    roleStudents.length > 0
      ? await fetchHonorBadgeLabelsByProfileId(
          supabase,
          roleStudents.map((s) => s.id),
        )
      : {};

  // 저장 시점 스냅샷 우선 (없으면 live 조회) + 명예 배지 병합
  const baseOfficerByStudentName =
    getOfficerSnapshotFromRecord(record) ??
    (record.group_name
      ? buildOfficerInfoByStudentName(roleStudents)
      : await fetchOfficersByStudentNames(
          supabase,
          getAssignedStudentNames(seatAssignments),
        ));

  const showTeamBadges = record.group_name
    ? await isGroupTeamAssignmentActive(supabase, record.group_name)
    : false;

  const classPresidentId = record.group_name
    ? await fetchClassPresidentIdForGroup(supabase, record.group_name)
    : null;

  const officerByStudentName = applyTeamBadgeVisibility(
    ensureClassPresidentInOfficerByStudentName(
      mergeHonorBadgesIntoOfficerByStudentName(
        baseOfficerByStudentName,
        roleStudents,
        honorLabelsByProfileId,
      ),
      roleStudents,
      classPresidentId,
    ),
    showTeamBadges,
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link href={editHref}>
          <Button variant="outline">
            <PencilLine className="size-4" />
            수정
          </Button>
        </Link>
        <Link href={listHref}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            목록
          </Button>
        </Link>
      </div>

      <SeatingChartDetailArticle
        title={record.title}
        createdAtLabel={createdAtLabel}
        createdAtIso={record.created_at}
        groupName={record.group_name}
        rowCount={record.row_count}
        colCount={record.col_count}
        aisleAfterColumns={record.aisle_after_columns ?? []}
        seatAssignments={seatAssignments}
        assignedCount={assignedCount}
        totalSeats={totalSeats}
        profileIdByName={profileIdByName}
        avatarUrlByName={avatarUrlByName}
        officerByStudentName={officerByStudentName}
        showTeamBadges={showTeamBadges}
      />
    </>
  );
}
