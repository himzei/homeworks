-- 관련뉴스 썸네일(og:image 등) URL

ALTER TABLE public.related_news
  ADD COLUMN IF NOT EXISTS image_url TEXT;
