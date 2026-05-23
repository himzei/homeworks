import { redirect } from "next/navigation";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** 기존 URL 호환: 관리자 패널 작성 페이지로 이동 */
export default async function LegacyNewAssignmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const group = params?.group;

  if (typeof group === "string" && group) {
    redirect(`/admin/assignments/new?group=${encodeURIComponent(group)}`);
  }

  redirect("/admin/assignments/new");
}
