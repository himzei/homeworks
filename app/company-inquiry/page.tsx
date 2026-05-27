import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";
import CompanyInquiryStickyBoard from "@/app/company-inquiry/sticky-board/CompanyInquiryStickyBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "기업(문의)",
  description: "기업/기관 문의를 포스트잇 게시판에 남길 수 있는 페이지입니다.",
  robots: { index: false, follow: false },
};

export default async function CompanyInquiryPage() {
  const supabase = await createClient();
  const { user, profile } = await requireApprovedMember(supabase);

  const { data: initialPosts, error } = await supabase
    .from("company_inquiry_posts")
    .select("id, author_id, author_name, is_anonymous, content, note_color, rotate_deg, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("기업(문의) 게시글 조회 오류:", error);
  }

  return (
    <CompanyInquiryStickyBoard
      initialPosts={initialPosts ?? []}
      currentUserId={user.id}
      currentUserName={profile.name ?? "사용자"}
    />
  );
}

