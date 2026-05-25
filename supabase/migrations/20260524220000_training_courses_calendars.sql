-- 사전·본교육 일정 캘린더 (커리큘럼 항목을 교육일에 배정한 결과)
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS pre_education_calendar JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS main_education_calendar JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.training_courses.pre_education_calendar IS
  '[{ "date": "YYYY-MM-DD", "weekdayLabel": "월", "isInstructional": true, "curriculum": "...", "instructor": "...", ... }]';
COMMENT ON COLUMN public.training_courses.main_education_calendar IS
  '[{ "date": "YYYY-MM-DD", "weekdayLabel": "월", "isInstructional": true, "curriculum": "...", "instructor": "...", ... }]';
