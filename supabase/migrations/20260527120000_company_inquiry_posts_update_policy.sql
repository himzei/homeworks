-- 작성자 본인 글 수정 허용

DROP POLICY IF EXISTS "Authors can update own company inquiry posts" ON public.company_inquiry_posts;

CREATE POLICY "Authors can update own company inquiry posts"
  ON public.company_inquiry_posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
