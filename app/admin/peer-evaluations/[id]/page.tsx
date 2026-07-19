import { notFound, redirect } from "next/navigation";

import PeerEvaluationResultsPanel from "@/app/admin/_components/PeerEvaluationResultsPanel";
import { fetchPeerEvaluationAdminResults } from "@/lib/peer-evaluation/fetch-admin-results";
import { fetchPeerEvaluationProjectById } from "@/lib/peer-evaluation/fetch-projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminPeerEvaluationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const groupParam =
    typeof query.group === "string" && query.group !== "all"
      ? query.group
      : null;
  const backHref = groupParam
    ? `/admin/peer-evaluations?group=${encodeURIComponent(groupParam)}`
    : "/admin/peer-evaluations";

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

  const project = await fetchPeerEvaluationProjectById(supabase, id);
  if (!project) {
    notFound();
  }

  const { summaries, details, totalRatingCount } =
    await fetchPeerEvaluationAdminResults(supabase, id);

  return (
    <PeerEvaluationResultsPanel
      project={project}
      summaries={summaries}
      details={details}
      totalRatingCount={totalRatingCount}
      backHref={backHref}
    />
  );
}
