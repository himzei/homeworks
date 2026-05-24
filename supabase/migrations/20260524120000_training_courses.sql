-- 교육 과정(training_courses) — group_name 마스터 데이터
CREATE TABLE IF NOT EXISTS public.training_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  -- group_name이 null인 레거시 과제를 함께 보여줄 과정 여부
  is_legacy BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_courses_sort_order ON public.training_courses(sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_courses_is_active ON public.training_courses(is_active);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active training courses" ON public.training_courses;
DROP POLICY IF EXISTS "Admins can view all training courses" ON public.training_courses;
DROP POLICY IF EXISTS "Admins can insert training courses" ON public.training_courses;
DROP POLICY IF EXISTS "Admins can update training courses" ON public.training_courses;
DROP POLICY IF EXISTS "Admins can delete training courses" ON public.training_courses;

CREATE POLICY "Authenticated users can view active training courses"
  ON public.training_courses
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can view all training courses"
  ON public.training_courses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert training courses"
  ON public.training_courses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update training courses"
  ON public.training_courses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete training courses"
  ON public.training_courses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_training_courses_updated_at ON public.training_courses;
CREATE TRIGGER set_training_courses_updated_at
  BEFORE UPDATE ON public.training_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 기존 하드코딩 과정을 DB로 이전 (중복 실행 안전)
INSERT INTO public.training_courses (name, description, is_legacy, sort_order)
VALUES
  (
    '15기 교육생 - 빅데이터 전문가 양성과정',
    '15기 교육생 대상 과정',
    false,
    30
  ),
  (
    '14기 교육생 - 빅데이터 전문가 양성과정',
    '14기 교육생 대상 과정',
    false,
    20
  ),
  (
    '13기 교육생 - 빅데이터 전문가 양성과정',
    '13기 교육생 대상 과정 (group_name 없는 레거시 과제 포함)',
    true,
    10
  )
ON CONFLICT (name) DO NOTHING;
