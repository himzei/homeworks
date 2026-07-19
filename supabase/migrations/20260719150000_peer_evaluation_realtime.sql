-- 관리자 결과 화면에서 학생 평가를 실시간으로 받기 위한 publication 등록
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'peer_evaluation_ratings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_evaluation_ratings;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'peer_evaluation_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.peer_evaluation_projects;
  END IF;
END $$;
