-- 자리배치도 저장 시점의 반장·조장·조원 배지 스냅샷
ALTER TABLE public.seating_charts
  ADD COLUMN IF NOT EXISTS officer_by_student_name JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.seating_charts.officer_by_student_name IS
  '저장 시점 반·조 정보. {"이름": {"classOfficerRole": "...", "teamNumber": 1}}';
