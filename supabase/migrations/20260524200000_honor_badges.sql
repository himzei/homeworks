-- 명예 배지 (예: 5월우수) — 과정별 정의 + 학생 부여
CREATE TABLE IF NOT EXISTS public.honor_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order <= 999),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT honor_badges_group_label_unique UNIQUE (group_name, label)
);

CREATE INDEX IF NOT EXISTS idx_honor_badges_group_name
  ON public.honor_badges(group_name);

COMMENT ON TABLE public.honor_badges IS '과정별 명예 배지 정의 (5월우수 등)';
COMMENT ON COLUMN public.honor_badges.label IS '배지 표시 이름';

CREATE TABLE IF NOT EXISTS public.profile_honor_badges (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  honor_badge_id UUID NOT NULL REFERENCES public.honor_badges(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (profile_id, honor_badge_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_honor_badges_badge
  ON public.profile_honor_badges(honor_badge_id);

COMMENT ON TABLE public.profile_honor_badges IS '학생에게 부여된 명예 배지';

ALTER TABLE public.honor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_honor_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view honor badges"
  ON public.honor_badges;
DROP POLICY IF EXISTS "Admins can insert honor badges"
  ON public.honor_badges;
DROP POLICY IF EXISTS "Admins can update honor badges"
  ON public.honor_badges;
DROP POLICY IF EXISTS "Admins can delete honor badges"
  ON public.honor_badges;

CREATE POLICY "Authenticated users can view honor badges"
  ON public.honor_badges
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert honor badges"
  ON public.honor_badges
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update honor badges"
  ON public.honor_badges
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete honor badges"
  ON public.honor_badges
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view profile honor badges"
  ON public.profile_honor_badges;
DROP POLICY IF EXISTS "Admins can insert profile honor badges"
  ON public.profile_honor_badges;
DROP POLICY IF EXISTS "Admins can delete profile honor badges"
  ON public.profile_honor_badges;

CREATE POLICY "Authenticated users can view profile honor badges"
  ON public.profile_honor_badges
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert profile honor badges"
  ON public.profile_honor_badges
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profile honor badges"
  ON public.profile_honor_badges
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
