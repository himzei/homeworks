-- 16기·17기 과정을 training_courses 에 추가 (이미 있으면 경우 무시)
INSERT INTO public.training_courses (name, description, is_legacy, sort_order, slug)
VALUES
  (
    '17기 교육생 - 빅데이터 전문가 양성과정',
    '17기 교육생 대상 과정',
    false,
    50,
    '17gi'
  ),
  (
    '16기 교육생 - 빅데이터 전문가 양성과정',
    '16기 교육생 대상 과정',
    false,
    40,
    '16gi'
  )
ON CONFLICT (name) DO NOTHING;
