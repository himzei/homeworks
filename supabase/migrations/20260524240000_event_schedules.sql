-- 행사 일정 (캘린더 표시용, 교육일 제외와 무관)
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS event_schedules JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.training_courses.event_schedules IS
  '[{ "id": "uuid", "date": "YYYY-MM-DD", "label": "OT", "startTime": "14:00", "endTime": "16:00" }]';
