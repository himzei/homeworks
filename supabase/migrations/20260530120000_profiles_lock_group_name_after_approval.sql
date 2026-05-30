-- 승인된 회원은 본인 프로필의 과정명(group_name) 변경 불가 (관리자는 예외)

CREATE OR REPLACE FUNCTION public.profiles_protect_group_name_after_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자가 수정하는 경우(본인·타인 모두)는 허용
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- 승인 완료 회원은 과정명 변경 불가
  IF OLD.approval_status = 'approved'
     AND NEW.group_name IS DISTINCT FROM OLD.group_name THEN
    NEW.group_name := OLD.group_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_group_name_after_approval ON public.profiles;
CREATE TRIGGER profiles_protect_group_name_after_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_group_name_after_approval();
