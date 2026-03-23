-- assignments 테이블에 group_name 컬럼 추가
-- null: 전체 그룹 공통 숙제
-- 특정 값: 해당 그룹 전용 숙제 (예: "14기 교육생 - 빅데이터 전문가 양성과정")
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- group_name 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_assignments_group_name ON public.assignments(group_name);

-- profiles.group_name 조회 성능 (진행과정 그룹 필터용)
CREATE INDEX IF NOT EXISTS idx_profiles_group_name ON public.profiles(group_name);
