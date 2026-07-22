-- 사다리게임: 기수(과정) 공통 "가장 큰 조(5인 조 등) 고정" 규칙
CREATE TABLE IF NOT EXISTS public.ladder_group_forced_largest_team_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT ladder_group_forced_largest_team_rules_name_not_empty
    CHECK (char_length(trim(student_name)) > 0)
);

-- 동일 기수·동일 학생 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_ladder_group_forced_largest_unique
  ON public.ladder_group_forced_largest_team_rules (group_name, student_name);

CREATE INDEX IF NOT EXISTS idx_ladder_group_forced_largest_group_name
  ON public.ladder_group_forced_largest_team_rules (group_name);

ALTER TABLE public.ladder_group_forced_largest_team_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules;
DROP POLICY IF EXISTS "Admins can insert ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules;
DROP POLICY IF EXISTS "Admins can delete ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules;

-- 승인 회원: 조회 (사다리 배정 시 서버에서 사용)
CREATE POLICY "Authenticated users can view ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 관리자만 추가
CREATE POLICY "Admins can insert ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 삭제
CREATE POLICY "Admins can delete ladder forced largest rules"
  ON public.ladder_group_forced_largest_team_rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.ladder_group_forced_largest_team_rules IS
  '기수별 사다리 — 가장 인원이 많은 결과(5인 조 등)에 반드시 배정될 학생';
