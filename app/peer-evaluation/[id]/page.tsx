import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import PeerEvaluationForm from "@/app/peer-evaluation/_components/PeerEvaluationForm";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import { fetchSeatingStudents } from "@/lib/fetch-group-students";
import { normalizeCriterionScores } from "@/lib/peer-evaluation/criteria";
import { fetchPeerEvaluationProjectById } from "@/lib/peer-evaluation/fetch-projects";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "동료평가 작성",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PeerEvaluationDetailPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { user, profile } = await requireApprovedMember(supabase);
  const isAdmin = profile.role === "admin";
  const userGroupName = profile.group_name?.trim() || null;

  if (!isAdmin && !userGroupName) {
    redirect("/profile?group_required=1");
  }

  const project = await fetchPeerEvaluationProjectById(supabase, projectId);
  if (!project) {
    notFound();
  }

  // draft는 학생에게 보이지 않음 (RLS). 혹시 모르면 차단
  if (project.status === "draft" && !isAdmin) {
    notFound();
  }

  if (!isAdmin && userGroupName !== project.groupName) {
    notFound();
  }

  const classmates = (await fetchSeatingStudents(supabase, project.groupName))
    .filter((student) => student.id !== user.id)
    .map((student) => ({ id: student.id, name: student.name }));

  // 본인이 준 평가만 조회 (RLS + evaluator_id 필터)
  const { data: ownRatings, error: ratingsError } = await supabase
    .from("peer_evaluation_ratings")
    .select("evaluatee_id, score, criterion_scores, comment")
    .eq("project_id", projectId)
    .eq("evaluator_id", user.id);

  if (ratingsError) {
    console.error("동료평가 본인 제출 조회 오류:", ratingsError);
  }

  const initialRatings = (ownRatings ?? []).map((row) => ({
    evaluateeId: row.evaluatee_id as string,
    score: row.score as number,
    criterionScores: normalizeCriterionScores(row.criterion_scores),
    comment: (row.comment as string | null) ?? null,
  }));

  return (
    <div className="container mx-auto px-4 py-6 sm:px-8 sm:py-10">
      <PeerEvaluationForm
        project={project}
        classmates={classmates}
        initialRatings={initialRatings}
        currentUserId={user.id}
      />
    </div>
  );
}
