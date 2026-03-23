-- surveys 테이블에 group_name 컬럼 추가
-- null: 전체 그룹 공통 설문
-- 특정 값: 해당 그룹 전용 설문
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS group_name TEXT;

CREATE INDEX IF NOT EXISTS idx_surveys_group_name ON public.surveys(group_name);
