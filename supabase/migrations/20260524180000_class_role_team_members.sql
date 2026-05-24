-- 조원 배정 (게시판 글별)
ALTER TABLE public.class_role_snapshots
  ADD COLUMN IF NOT EXISTS team_members JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.class_role_snapshots.team_members IS
  '조별 조원 user id 목록. {"1": ["uuid", ...], "2": [...]}';

COMMENT ON COLUMN public.profiles.team_number IS
  '소속 조 번호 (1~). 조장·조원 공통';
