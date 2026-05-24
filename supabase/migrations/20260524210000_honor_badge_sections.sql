-- 명예 배지 섹션 (섹션별 제목 + 배지 그룹)
CREATE TABLE IF NOT EXISTS public.honor_badge_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order <= 999),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_honor_badge_sections_group_name
  ON public.honor_badge_sections(group_name);

COMMENT ON TABLE public.honor_badge_sections IS '과정별 명예 배지 섹션 (예: 이달의 우수학생)';
COMMENT ON COLUMN public.honor_badge_sections.title IS '섹션 표시 제목';

ALTER TABLE public.honor_badges
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.honor_badge_sections(id) ON DELETE CASCADE;

-- 기존 배지 → 그룹당 기본 섹션 1개로 이전
INSERT INTO public.honor_badge_sections (group_name, title, sort_order)
SELECT DISTINCT hb.group_name, hb.group_name || ' 명예 배지', 0
FROM public.honor_badges hb
WHERE hb.section_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.honor_badge_sections s
    WHERE s.group_name = hb.group_name
  );

UPDATE public.honor_badges hb
SET section_id = s.id
FROM public.honor_badge_sections s
WHERE hb.section_id IS NULL
  AND hb.group_name = s.group_name
  AND s.sort_order = 0;

ALTER TABLE public.honor_badges
  DROP CONSTRAINT IF EXISTS honor_badges_group_label_unique;

ALTER TABLE public.honor_badges
  DROP CONSTRAINT IF EXISTS honor_badges_section_label_unique;

ALTER TABLE public.honor_badges
  ADD CONSTRAINT honor_badges_section_label_unique UNIQUE (section_id, label);

CREATE INDEX IF NOT EXISTS idx_honor_badges_section_id
  ON public.honor_badges(section_id);

ALTER TABLE public.honor_badge_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view honor badge sections"
  ON public.honor_badge_sections;
DROP POLICY IF EXISTS "Admins can insert honor badge sections"
  ON public.honor_badge_sections;
DROP POLICY IF EXISTS "Admins can update honor badge sections"
  ON public.honor_badge_sections;
DROP POLICY IF EXISTS "Admins can delete honor badge sections"
  ON public.honor_badge_sections;

CREATE POLICY "Authenticated users can view honor badge sections"
  ON public.honor_badge_sections
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert honor badge sections"
  ON public.honor_badge_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update honor badge sections"
  ON public.honor_badge_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete honor badge sections"
  ON public.honor_badge_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
