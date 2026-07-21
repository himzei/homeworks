-- 사다리게임: 기수(과정) 공통 "같은 결과 금지" 규칙
CREATE TABLE IF NOT EXISTS public.ladder_group_exclusion_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  name_a TEXT NOT NULL,
  name_b TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT ladder_group_exclusion_rules_distinct_names CHECK (name_a <> name_b)
);

-- 동일 기수·동일 쌍(순서 무관) 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_ladder_group_exclusion_rules_unique_pair
  ON public.ladder_group_exclusion_rules (
    group_name,
    LEAST(name_a, name_b),
    GREATEST(name_a, name_b)
  );

CREATE INDEX IF NOT EXISTS idx_ladder_group_exclusion_rules_group_name
  ON public.ladder_group_exclusion_rules (group_name);

ALTER TABLE public.ladder_group_exclusion_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ladder exclusion rules"
  ON public.ladder_group_exclusion_rules;
DROP POLICY IF EXISTS "Admins can insert ladder exclusion rules"
  ON public.ladder_group_exclusion_rules;
DROP POLICY IF EXISTS "Admins can delete ladder exclusion rules"
  ON public.ladder_group_exclusion_rules;

-- 승인 회원: 조회 (사다리 배정 시 서버에서 사용)
CREATE POLICY "Authenticated users can view ladder exclusion rules"
  ON public.ladder_group_exclusion_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 관리자만 추가
CREATE POLICY "Admins can insert ladder exclusion rules"
  ON public.ladder_group_exclusion_rules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 삭제
CREATE POLICY "Admins can delete ladder exclusion rules"
  ON public.ladder_group_exclusion_rules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.ladder_group_exclusion_rules IS
  '기수별 사다리 같은 결과 금지 쌍 (전역 규칙)';

-- 사다리 게임에 대상 기수 연결 (기수에서 불러오기 시 저장)
ALTER TABLE public.ladder_games
  ADD COLUMN IF NOT EXISTS group_name TEXT;

COMMENT ON COLUMN public.ladder_games.group_name IS
  '참가자를 불러온 기수(과정명). 기수 공통 금지 규칙 적용에 사용';
