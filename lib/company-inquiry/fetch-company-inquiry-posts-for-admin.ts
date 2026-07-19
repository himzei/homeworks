import type { SupabaseClient } from "@supabase/supabase-js";

/** 관리자 취합 화면용 기업(문의) 글 */
export type CompanyInquiryAdminPost = {
  id: string;
  content: string;
  isAnonymous: boolean;
  /** 게시판에 보이는 이름 (익명이면 null) */
  publicAuthorName: string | null;
  createdAt: string;
  authorId: string;
  /** 관리자만 보는 실제 작성자 이름 */
  authorRealName: string;
  /** 글에 저장된 기수(과정명). 없으면 작성자 프로필 기수로 폴백 */
  authorGroupName: string | null;
};

type PostRow = {
  id: string;
  author_id: string;
  author_name: string | null;
  is_anonymous: boolean;
  content: string;
  created_at: string;
  group_name: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  group_name: string | null;
};

/** 관리자용 기업(문의) 글 전체 조회 (작성자 프로필 포함) */
export async function fetchCompanyInquiryPostsForAdmin(
  supabase: SupabaseClient,
): Promise<CompanyInquiryAdminPost[]> {
  const { data: posts, error: postsError } = await supabase
    .from("company_inquiry_posts")
    .select(
      "id, author_id, author_name, is_anonymous, content, created_at, group_name",
    )
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("기업(문의) 목록 조회 실패:", postsError);
    return [];
  }

  const rows = (posts ?? []) as PostRow[];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((row) => row.author_id))];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, group_name")
    .in("id", authorIds);

  if (profilesError) {
    console.error("기업(문의) 작성자 프로필 조회 실패:", profilesError);
  }

  const profileById = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );

  return rows.map((row) => {
    const profile = profileById.get(row.author_id);
    return {
      id: row.id,
      content: row.content,
      isAnonymous: row.is_anonymous,
      publicAuthorName: row.author_name,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorRealName: profile?.name?.trim() || "이름 없음",
      // 글 작성 시점 기수를 우선 사용
      authorGroupName: row.group_name ?? profile?.group_name ?? null,
    };
  });
}
