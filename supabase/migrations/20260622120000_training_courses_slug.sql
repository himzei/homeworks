-- 과정 슬러그 (URL·식별용 짧은 코드)
ALTER TABLE public.training_courses
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 기존 과정: "16기 ..." → 16gi 형식으로 백필
UPDATE public.training_courses
SET slug = lower(substring(name FROM '^(\d+)')) || 'gi'
WHERE slug IS NULL
  AND name ~ '^\d+기';

-- 패턴 불일치 과정: id 기반 임시 슬러그
UPDATE public.training_courses
SET slug = 'course-' || replace(left(id::text, 8), '-', '')
WHERE slug IS NULL;

ALTER TABLE public.training_courses
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_courses_slug
  ON public.training_courses (slug);

COMMENT ON COLUMN public.training_courses.slug IS
  '과정 식별용 슬러그 (영문 소문자·숫자·하이픈). group_name(과정명)과 별도.';
