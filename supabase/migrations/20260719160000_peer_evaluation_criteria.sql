-- 동료평가 프로젝트별 평가항목 + 항목별 점수 저장

ALTER TABLE public.peer_evaluation_projects
  ADD COLUMN IF NOT EXISTS criteria JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.peer_evaluation_ratings
  ADD COLUMN IF NOT EXISTS criterion_scores JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.peer_evaluation_projects.criteria IS
  '평가항목 배열 [{id, label, maxScore, sortOrder}]';

COMMENT ON COLUMN public.peer_evaluation_ratings.criterion_scores IS
  '항목별 점수 맵 {criterionId: score}. score 컬럼은 항목 평균(반올림).';

-- 기존 프로젝트: 종합 1항목 기본값
UPDATE public.peer_evaluation_projects
SET criteria = '[
  {"id":"overall","label":"종합","maxScore":10,"sortOrder":0}
]'::jsonb
WHERE criteria = '[]'::jsonb
   OR criteria IS NULL
   OR jsonb_typeof(criteria) <> 'array'
   OR jsonb_array_length(criteria) = 0;

-- 기존 평가: 종합 항목에 기존 score 매핑
UPDATE public.peer_evaluation_ratings
SET criterion_scores = jsonb_build_object('overall', score)
WHERE criterion_scores = '{}'::jsonb
   OR criterion_scores IS NULL;
