-- 반·조 게시판: 프로젝트 평가일(입력용) 추가
ALTER TABLE public.class_role_snapshots
  ADD COLUMN IF NOT EXISTS project_evaluation_date DATE;

COMMENT ON COLUMN public.class_role_snapshots.project_evaluation_date IS
  '프로젝트 평가일(관리자 입력). 조별 평가 취합/프로젝트 평가 섹션에 표시.';

