-- 기수별 학생 최종 평가 (교수 평가·상담 요약 저장)

CREATE TABLE IF NOT EXISTS public.student_final_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consultation_summary TEXT,
  professor_final_evaluation TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT student_final_evaluations_group_student_unique UNIQUE (group_name, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_final_evaluations_group
  ON public.student_final_evaluations (group_name);

CREATE INDEX IF NOT EXISTS idx_student_final_evaluations_student
  ON public.student_final_evaluations (student_id);

ALTER TABLE public.student_final_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view student final evaluations" ON public.student_final_evaluations;
DROP POLICY IF EXISTS "Admins can insert student final evaluations" ON public.student_final_evaluations;
DROP POLICY IF EXISTS "Admins can update student final evaluations" ON public.student_final_evaluations;
DROP POLICY IF EXISTS "Admins can delete student final evaluations" ON public.student_final_evaluations;

CREATE POLICY "Admins can view student final evaluations"
  ON public.student_final_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert student final evaluations"
  ON public.student_final_evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update student final evaluations"
  ON public.student_final_evaluations FOR UPDATE
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

CREATE POLICY "Admins can delete student final evaluations"
  ON public.student_final_evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_student_final_evaluations_updated_at ON public.student_final_evaluations;
CREATE TRIGGER set_student_final_evaluations_updated_at
  BEFORE UPDATE ON public.student_final_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
