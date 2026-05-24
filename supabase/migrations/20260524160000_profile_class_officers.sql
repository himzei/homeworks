-- 반장·조장 역할 (profiles.role 과 별도)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS class_officer_role TEXT,
  ADD COLUMN IF NOT EXISTS team_number INTEGER;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_class_officer_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_class_officer_role_check
  CHECK (
    class_officer_role IS NULL
    OR class_officer_role IN ('class_president', 'team_leader')
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_team_number_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_team_number_check
  CHECK (team_number IS NULL OR (team_number >= 1 AND team_number <= 99));

-- 과정당 반장 1명
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_one_class_president_per_group
  ON public.profiles (group_name)
  WHERE class_officer_role = 'class_president' AND group_name IS NOT NULL;

-- 과정·조당 조장 1명
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_one_team_leader_per_group_team
  ON public.profiles (group_name, team_number)
  WHERE class_officer_role = 'team_leader'
    AND group_name IS NOT NULL
    AND team_number IS NOT NULL;

COMMENT ON COLUMN public.profiles.class_officer_role IS
  'class_president(반장) | team_leader(조장), null=일반';
COMMENT ON COLUMN public.profiles.team_number IS '조장일 때 조 번호 (1~)';
