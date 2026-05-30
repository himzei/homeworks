import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StudentConsultationDetail, {
  type StudentConsultationProfile,
} from "@/app/_components/StudentConsultationDetail";
import { Button } from "@/app/_components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { studentId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", studentId)
    .single();

  return {
    title: data?.name ? `${data.name} · 학생 상담` : "학생 상담 상세",
  };
}

/**
 * 관리자 - 학생 상담 상세 페이지
 */
export default async function AdminConsultationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { studentId } = await params;
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, name, group_name, phone, bio, avatar_url, github_url, university, major, created_at, role",
    )
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  if (profile.role === "admin") {
    notFound();
  }

  // 이메일 조회 (RPC)
  let studentEmail: string | null = null;
  const { data: emailData, error: emailError } = await supabase.rpc(
    "get_user_emails",
    { user_ids: [studentId] },
  );

  if (!emailError && emailData?.[0]?.email) {
    studentEmail = emailData[0].email;
  }

  const student: StudentConsultationProfile = {
    id: profile.id,
    name: profile.name,
    email: studentEmail,
    group_name: profile.group_name,
    phone: profile.phone,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    github_url: profile.github_url,
    university: profile.university,
    major: profile.major,
    created_at: profile.created_at,
  };

  const listHref = filterGroup
    ? `/admin/consultations?group=${encodeURIComponent(filterGroup)}`
    : "/admin/consultations";

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Link href={listHref}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            목록
          </Button>
        </Link>
      </div>

      <StudentConsultationDetail student={student} />
    </>
  );
}
