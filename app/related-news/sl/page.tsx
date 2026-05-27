import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import RelatedNewsBoard from "@/app/related-news/_components/RelatedNewsBoard";
import { fetchRelatedNewsPage } from "@/lib/related-news/fetch-related-news-page";

export const metadata: Metadata = {
  title: "관련뉴스 - SL",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_PATH = "/related-news/sl";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function RelatedNewsSlPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  await requireApprovedMember(supabase);

  const params = await searchParams;
  const rawPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const { items, currentPage, totalPages, totalCount } =
    await fetchRelatedNewsPage(supabase, {
      category: "sl",
      page: requestedPage,
    });

  if (requestedPage !== currentPage && totalCount > 0) {
    const query = currentPage > 1 ? `?page=${currentPage}` : "";
    redirect(`${BASE_PATH}${query}`);
  }

  return (
    <RelatedNewsBoard
      items={items}
      boardTitle="SL 관련뉴스"
      basePath={BASE_PATH}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
}
