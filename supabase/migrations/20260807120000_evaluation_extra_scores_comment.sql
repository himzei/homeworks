-- 시험·미니프로젝트 등 추가 평가 점수에 코멘트 저장

ALTER TABLE public.evaluation_extra_scores
  ADD COLUMN IF NOT EXISTS comment TEXT;

COMMENT ON COLUMN public.evaluation_extra_scores.comment IS
  '관리자가 남긴 평가 코멘트 (시험·미니프로젝트 등)';
