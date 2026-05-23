-- 평가 그리드용 추가 필드(시험, 프로젝트 등) 및 학생별 점수

CREATE TABLE IF NOT EXISTS public.evaluation_extra_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  group_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_extra_fields_sort
  ON public.evaluation_extra_fields (sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.evaluation_extra_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID REFERENCES public.evaluation_extra_fields(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT evaluation_extra_scores_score_range CHECK (score >= 0 AND score <= 999),
  UNIQUE (field_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluation_extra_scores_field
  ON public.evaluation_extra_scores (field_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_extra_scores_user
  ON public.evaluation_extra_scores (user_id);

ALTER TABLE public.evaluation_extra_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_extra_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view evaluation extra fields" ON public.evaluation_extra_fields;
DROP POLICY IF EXISTS "Admins can insert evaluation extra fields" ON public.evaluation_extra_fields;
DROP POLICY IF EXISTS "Admins can update evaluation extra fields" ON public.evaluation_extra_fields;
DROP POLICY IF EXISTS "Admins can delete evaluation extra fields" ON public.evaluation_extra_fields;

CREATE POLICY "Admins can view evaluation extra fields"
  ON public.evaluation_extra_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert evaluation extra fields"
  ON public.evaluation_extra_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update evaluation extra fields"
  ON public.evaluation_extra_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete evaluation extra fields"
  ON public.evaluation_extra_fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view evaluation extra scores" ON public.evaluation_extra_scores;
DROP POLICY IF EXISTS "Admins can insert evaluation extra scores" ON public.evaluation_extra_scores;
DROP POLICY IF EXISTS "Admins can update evaluation extra scores" ON public.evaluation_extra_scores;
DROP POLICY IF EXISTS "Admins can delete evaluation extra scores" ON public.evaluation_extra_scores;

CREATE POLICY "Admins can view evaluation extra scores"
  ON public.evaluation_extra_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert evaluation extra scores"
  ON public.evaluation_extra_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update evaluation extra scores"
  ON public.evaluation_extra_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete evaluation extra scores"
  ON public.evaluation_extra_scores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 기본 필드: 시험, 프로젝트 (전역, 중복 삽입 방지)
INSERT INTO public.evaluation_extra_fields (title, group_name, sort_order)
SELECT v.title, NULL, v.sort_order
FROM (VALUES ('시험', 0), ('프로젝트', 1)) AS v(title, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.evaluation_extra_fields f
  WHERE f.title = v.title AND f.group_name IS NULL
);
