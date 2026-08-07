-- 시험·미니프로젝트 평가 항목별 채점 방식 (점수 / 등급)
ALTER TABLE public.evaluation_extra_fields
  ADD COLUMN IF NOT EXISTS scoring_method TEXT;

ALTER TABLE public.evaluation_extra_fields
  DROP CONSTRAINT IF EXISTS evaluation_extra_fields_scoring_method_check;

ALTER TABLE public.evaluation_extra_fields
  ADD CONSTRAINT evaluation_extra_fields_scoring_method_check
  CHECK (
    scoring_method IS NULL
    OR scoring_method IN ('score', 'grade')
  );

-- 기존 항목은 점수 채점으로 기본 설정
UPDATE public.evaluation_extra_fields
SET scoring_method = 'score'
WHERE scoring_method IS NULL;

COMMENT ON COLUMN public.evaluation_extra_fields.scoring_method IS
  '채점 방식: score(점수) | grade(A/B/C/D/F 등급)';
