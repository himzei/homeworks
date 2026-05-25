-- 회원 휴면(탈퇴) 처리: 과정 미분류 + 전체 목록에서 숨김
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_dormant BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_dormant
  ON public.profiles (is_dormant)
  WHERE is_dormant = true;

COMMENT ON COLUMN public.profiles.is_dormant IS
  '휴면(탈퇴) 회원. true이면 group_name을 null로 두고 일반 화면 목록에서 제외.';
