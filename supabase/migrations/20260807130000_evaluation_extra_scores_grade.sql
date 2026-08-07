-- 시험·미니프로젝트 평가 등급 (A/B/C/D/F)
ALTER TABLE public.evaluation_extra_scores
  ADD COLUMN IF NOT EXISTS grade TEXT;

ALTER TABLE public.evaluation_extra_scores
  DROP CONSTRAINT IF EXISTS evaluation_extra_scores_grade_check;

ALTER TABLE public.evaluation_extra_scores
  ADD CONSTRAINT evaluation_extra_scores_grade_check
  CHECK (grade IS NULL OR grade IN ('A', 'B', 'C', 'D', 'F'));

COMMENT ON COLUMN public.evaluation_extra_scores.grade IS
  '시험·미니프로젝트 평가 등급 (A/B/C/D/F). score는 합산용 환산 점수.';
