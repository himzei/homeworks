-- 회원가입 관리자 승인 (pending → approved)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_approval_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 기존 회원·관리자는 승인 완료로 간주
UPDATE public.profiles
SET approval_status = 'approved'
WHERE role = 'admin' OR approval_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_approval_status
  ON public.profiles (approval_status);

COMMENT ON COLUMN public.profiles.approval_status IS
  '회원 승인 상태: pending(대기), approved(승인), rejected(거절). 관리자는 항상 approved.';

-- 신규 프로필은 학생만 pending, 관리자는 approved
CREATE OR REPLACE FUNCTION public.profiles_set_approval_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    NEW.approval_status := 'approved';
  ELSE
    NEW.approval_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_approval_on_insert ON public.profiles;
CREATE TRIGGER profiles_set_approval_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_set_approval_on_insert();

-- 본인이 approval_status 를 바꾸지 못하도록 (관리자만 변경 가능)
CREATE OR REPLACE FUNCTION public.profiles_protect_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_approval_status ON public.profiles;
CREATE TRIGGER profiles_protect_approval_status
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_approval_status();

-- 관리자: 모든 프로필 승인 상태 수정
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
  );
