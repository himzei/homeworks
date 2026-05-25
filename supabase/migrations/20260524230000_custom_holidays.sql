-- 휴일 직접 입력 (날짜 + 표시 이름)
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS custom_holidays JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.training_courses.custom_holidays IS
  '[{ "id": "uuid", "date": "YYYY-MM-DD", "label": "방학" }]';

-- 기존 DATE[] 데이터 이전
UPDATE public.training_courses
SET custom_holidays = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',
        gen_random_uuid()::text,
        'date',
        to_char(d, 'YYYY-MM-DD'),
        'label',
        ''
      )
      ORDER BY d
    ),
    '[]'::jsonb
  )
  FROM unnest(custom_excluded_dates) AS d
)
WHERE custom_excluded_dates IS NOT NULL
  AND cardinality(custom_excluded_dates) > 0
  AND custom_holidays = '[]'::jsonb;
