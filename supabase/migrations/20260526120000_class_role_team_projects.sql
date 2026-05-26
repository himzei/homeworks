-- 조별 프로젝트 정보 (주제, GitHub, PPT 첨부)
ALTER TABLE public.class_role_snapshots
  ADD COLUMN IF NOT EXISTS team_projects JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.class_role_snapshots.team_projects IS
  '조별 프로젝트 {"1": {topic, github_url, ppt_storage_path, ppt_file_name}} — 첨부: PPT/PDF/한글/엑셀/이미지 등';

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'class-role-team-files',
  'class-role-team-files',
  false,
  52428800
)
ON CONFLICT (id) DO NOTHING;
