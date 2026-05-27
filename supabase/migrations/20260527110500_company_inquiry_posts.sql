-- 기업(문의) 포스트잇 게시판

CREATE TABLE IF NOT EXISTS public.company_inquiry_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT, -- 익명 작성 시 null
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  content TEXT NOT NULL,
  -- UI 표현용(포스트잇 색/회전 각도). 저장해두면 새로고침해도 동일하게 보임
  note_color TEXT NOT NULL DEFAULT 'yellow',
  rotate_deg SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_inquiry_posts_created_at
  ON public.company_inquiry_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_inquiry_posts_author_id
  ON public.company_inquiry_posts (author_id);

ALTER TABLE public.company_inquiry_posts ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 삭제 (재실행 안전)
DROP POLICY IF EXISTS "Approved members can view company inquiry posts" ON public.company_inquiry_posts;
DROP POLICY IF EXISTS "Approved members can insert company inquiry posts" ON public.company_inquiry_posts;
DROP POLICY IF EXISTS "Authors can delete own company inquiry posts" ON public.company_inquiry_posts;
DROP POLICY IF EXISTS "Admins can delete any company inquiry posts" ON public.company_inquiry_posts;

-- 승인된 회원(및 관리자)만 조회 가능
CREATE POLICY "Approved members can view company inquiry posts"
  ON public.company_inquiry_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.approval_status = 'approved')
        AND (p.is_dormant IS DISTINCT FROM true)
    )
  );

-- 승인된 회원(및 관리자)만 작성 가능
CREATE POLICY "Approved members can insert company inquiry posts"
  ON public.company_inquiry_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.approval_status = 'approved')
        AND (p.is_dormant IS DISTINCT FROM true)
    )
  );

-- 작성자는 본인 글 삭제 가능
CREATE POLICY "Authors can delete own company inquiry posts"
  ON public.company_inquiry_posts
  FOR DELETE
  USING (auth.uid() = author_id);

-- 관리자는 어떤 글이든 삭제 가능
CREATE POLICY "Admins can delete any company inquiry posts"
  ON public.company_inquiry_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

