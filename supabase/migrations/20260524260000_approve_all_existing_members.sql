-- 기존 등록 회원 전원 승인 처리 (일회성)
-- approval_status 보호 트리거는 auth.uid() 관리자만 허용 → SQL 일괄 처리 시 잠시 해제

ALTER TABLE public.profiles DISABLE TRIGGER profiles_protect_approval_status;

UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status IS DISTINCT FROM 'approved';

ALTER TABLE public.profiles ENABLE TRIGGER profiles_protect_approval_status;
