import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, LayoutGrid, PencilLine } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  fetchProfileIdsByNames,
  fetchSeatingStudents,
} from "@/lib/fetch-group-students";
import {
  buildProfileIdByName,
  countAssignedSeats,
  getAssignedStudentNames,
  type SeatingChartRecord,
} from "@/lib/seating";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../_components/AdminSubNav";
import SeatingChartDetailArticle from "../../_components/SeatingChartDetailArticle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** 작성일 포매터 */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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

  // 이름 → 프로필 id (상세보기에서 이름 클릭 시 이동)
  const profileIdByName = record.group_name
    ? buildProfileIdByName(
        await fetchSeatingStudents(supabase, record.group_name),
      )
    : buildProfileIdByName(
        await fetchProfileIdsByNames(
          supabase,
          getAssignedStudentNames(seatAssignments),
        ),
      );

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 flex items-center gap-2">
                <LayoutGrid className="size-7 shrink-0" />
                자리배치도
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                저장된 자리배치도를 확인합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
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
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

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
        />
      </main>
    </div>
  );
}
