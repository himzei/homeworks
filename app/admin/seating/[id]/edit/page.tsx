import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchGroupOptions } from "@/lib/fetch-group-options";
import type { SeatingChartRecord } from "@/lib/seating";
import { Button } from "@/app/_components/ui/button";

import AdminSubNav from "../../../_components/AdminSubNav";
import SeatingChartForm from "../../../_components/SeatingChartForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "자리배치도 수정",
  description: "관리자 패널에서 자리배치도를 수정합니다.",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 관리자 - 자리배치도 수정 페이지
 */
export default async function AdminSeatingEditPage({
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
  const groupOptions = await fetchGroupOptions(supabase);

  const listHref = filterGroup
    ? `/admin/seating?group=${encodeURIComponent(filterGroup)}`
    : "/admin/seating";

  const detailHref = filterGroup
    ? `/admin/seating/${id}?group=${encodeURIComponent(filterGroup)}`
    : `/admin/seating/${id}`;

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-4 sm:py-8 px-4 sm:px-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
                자리배치도 수정
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {record.title}
              </p>
            </div>
            <Link href={detailHref}>
              <Button variant="outline">
                <ArrowLeft className="size-4" />
                상세보기
              </Button>
            </Link>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminSubNav />
        </Suspense>

        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-6">
          <SeatingChartForm
            initialData={{
              id: record.id,
              title: record.title,
              groupName: record.group_name,
              rowCount: record.row_count,
              colCount: record.col_count,
              aisleAfterColumns: record.aisle_after_columns ?? [],
              seatAssignments: record.seat_assignments ?? {},
            }}
            listHref={listHref}
            groupOptions={groupOptions}
          />
        </div>
      </main>
    </div>
  );
}
