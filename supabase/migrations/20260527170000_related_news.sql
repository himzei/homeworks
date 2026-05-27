-- 관련뉴스(네이버 뉴스 API 수집 결과) 게시판

CREATE TABLE IF NOT EXISTS public.related_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- SL / THN 등 카테고리
  category TEXT NOT NULL,

  -- 어떤 키워드(또는 조합)로 검색해서 가져온 뉴스인지 (운영/디버깅 용도)
  query TEXT,

  title TEXT NOT NULL,
  description TEXT,

  -- 네이버 뉴스 검색 API가 주는 링크들
  origin_link TEXT NOT NULL,
  naver_link TEXT,

  published_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 동일 카테고리 내에서는 원문 링크 기준으로 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS ux_related_news_category_origin_link
  ON public.related_news (category, origin_link);

CREATE INDEX IF NOT EXISTS idx_related_news_category_published_at
  ON public.related_news (category, published_at DESC);

-- updated_at 자동 갱신 트리거(재실행 안전)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_related_news_set_updated_at ON public.related_news;
CREATE TRIGGER trg_related_news_set_updated_at
BEFORE UPDATE ON public.related_news
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.related_news ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 삭제 (재실행 안전)
DROP POLICY IF EXISTS "Approved members can view related news" ON public.related_news;

-- 승인된 회원(및 관리자)만 조회 가능
CREATE POLICY "Approved members can view related news"
  ON public.related_news
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

