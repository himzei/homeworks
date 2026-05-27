-- 관리자: 관련뉴스 게시물 삭제

DROP POLICY IF EXISTS "Admins can delete related news" ON public.related_news;

CREATE POLICY "Admins can delete related news"
  ON public.related_news
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
