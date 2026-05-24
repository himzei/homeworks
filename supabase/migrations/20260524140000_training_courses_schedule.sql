-- 과정 일정·커리큘럼·휴일 제외 설정
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS pre_education_start_date DATE,
  ADD COLUMN IF NOT EXISTS pre_education_end_date DATE,
  ADD COLUMN IF NOT EXISTS pre_education_curriculum JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS main_education_start_date DATE,
  ADD COLUMN IF NOT EXISTS main_education_end_date DATE,
  ADD COLUMN IF NOT EXISTS main_education_curriculum JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclude_saturday BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exclude_sunday BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exclude_legal_holidays BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exclude_substitute_holidays BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_excluded_dates DATE[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.training_courses.pre_education_curriculum IS
  '[{ "id": "uuid", "title": "...", "contents": "...", "sort_order": 0 }]';
COMMENT ON COLUMN public.training_courses.main_education_curriculum IS
  '[{ "id": "uuid", "title": "...", "contents": "...", "sort_order": 0 }]';
