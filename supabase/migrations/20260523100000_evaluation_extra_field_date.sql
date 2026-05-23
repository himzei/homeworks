-- 추가 평가 필드 표시·정렬용 날짜 (관리자가 수정 가능)

ALTER TABLE public.evaluation_extra_fields
ADD COLUMN IF NOT EXISTS field_date DATE;

-- 기존 행: 생성일 기준으로 표시 날짜 초기화
UPDATE public.evaluation_extra_fields
SET field_date = (created_at AT TIME ZONE 'UTC')::date
WHERE field_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_evaluation_extra_fields_field_date
  ON public.evaluation_extra_fields (field_date DESC NULLS LAST);
