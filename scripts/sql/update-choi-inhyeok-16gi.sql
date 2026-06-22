-- 오늘(2026-06-22) 가입한 최인혁 학생 → 16기 과정 배정
-- Supabase Dashboard → SQL Editor 에서 실행

ALTER TABLE public.profiles DISABLE TRIGGER profiles_protect_group_name_after_approval;

UPDATE public.profiles
SET
  group_name = '16기 교육생 - 빅데이터 전문가 양성과정',
  updated_at = timezone('utc', now())
WHERE id = '6bfcd501-a144-48fe-a34d-301caf685423'
  AND name = '최인혁';

ALTER TABLE public.profiles ENABLE TRIGGER profiles_protect_group_name_after_approval;

-- 결과 확인
SELECT id, name, group_name, approval_status, created_at
FROM public.profiles
WHERE id = '6bfcd501-a144-48fe-a34d-301caf685423';
