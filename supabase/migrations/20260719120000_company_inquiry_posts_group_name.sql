-- 기업(문의) 포스트잇: 기수(과정)별 격리
-- 같은 group_name 회원끼리만 조회·작성 가능 (관리자는 전체)

ALTER TABLE public.company_inquiry_posts
  ADD COLUMN IF NOT EXISTS group_name TEXT;

-- 기존 글: 작성자 프로필의 기수로 백필
UPDATE public.company_inquiry_posts AS cip
SET group_name = p.group_name
FROM public.profiles AS p
WHERE cip.author_id = p.id
  AND cip.group_name IS NULL
  AND p.group_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_company_inquiry_posts_group_name
  ON public.company_inquiry_posts (group_name);

-- 기존 SELECT/INSERT 정책 교체 (기수 조건 추가)
DROP POLICY IF EXISTS "Approved members can view company inquiry posts" ON public.company_inquiry_posts;
DROP POLICY IF EXISTS "Approved members can insert company inquiry posts" ON public.company_inquiry_posts;

-- 관리자: 전체 조회 / 승인 회원: 본인 기수 글만 조회
CREATE POLICY "Approved members can view company inquiry posts"
  ON public.company_inquiry_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.is_dormant IS DISTINCT FROM true)
        AND (
          p.role = 'admin'
          OR (
            p.approval_status = 'approved'
            AND p.group_name IS NOT NULL
            AND p.group_name = company_inquiry_posts.group_name
          )
        )
    )
  );

-- 관리자: 임의 기수로 작성 가능 / 승인 회원: 본인 기수로만 작성
CREATE POLICY "Approved members can insert company inquiry posts"
  ON public.company_inquiry_posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND group_name IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.is_dormant IS DISTINCT FROM true)
        AND (
          p.role = 'admin'
          OR (
            p.approval_status = 'approved'
            AND p.group_name = company_inquiry_posts.group_name
          )
        )
    )
  );
