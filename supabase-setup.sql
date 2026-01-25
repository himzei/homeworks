-- 프로필 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- profiles 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  group_name TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user', -- 사용자 역할: 'admin' 또는 'user' (기본값: 'user')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 정책 생성: 모든 인증된 사용자는 모든 프로필을 조회 가능 (진행과정 표시를 위해 필요)
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 정책 생성: 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 정책 생성: 사용자는 자신의 프로필만 삽입 가능
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- updated_at 자동 업데이트를 위한 함수 생성
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 과제(Homeworks) 테이블 생성
-- ============================================

-- homeworks 테이블 생성
CREATE TABLE IF NOT EXISTS public.homeworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  homework_number INTEGER NOT NULL, -- 과제 번호 (1, 2, 3, ...)
  url TEXT NOT NULL, -- 과제 URL 주소
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- 같은 사용자의 같은 과제 번호는 중복되지 않도록 제약 조건
  UNIQUE(user_id, homework_number)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_homeworks_user_id ON public.homeworks(user_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_user_id_number ON public.homeworks(user_id, homework_number);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 사용자는 자신의 과제만 조회 가능
CREATE POLICY "Users can view own homeworks"
  ON public.homeworks
  FOR SELECT
  USING (auth.uid() = user_id);

-- 정책 생성: 모든 인증된 사용자는 모든 제출 정보를 조회 가능 (진행과정 표시를 위해 필요)
CREATE POLICY "Authenticated users can view all homeworks"
  ON public.homeworks
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 정책 생성: 사용자는 자신의 과제만 수정 가능
CREATE POLICY "Users can update own homeworks"
  ON public.homeworks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 과제만 삽입 가능
CREATE POLICY "Users can insert own homeworks"
  ON public.homeworks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 과제만 삭제 가능
CREATE POLICY "Users can delete own homeworks"
  ON public.homeworks
  FOR DELETE
  USING (auth.uid() = user_id);

-- homeworks 테이블의 updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER set_homeworks_updated_at
  BEFORE UPDATE ON public.homeworks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 숙제(Assignments) 테이블 생성
-- 교사/관리자가 숙제를 등록하는 테이블
-- ============================================

-- assignments 테이블 생성
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, -- 숙제 제목
  content TEXT, -- 숙제 내용 (선택적)
  start_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 게시 시작일과 시간
  end_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 게시 종료일과 시간
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 생성한 사용자 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- 종료일은 시작일보다 이후여야 함
  CONSTRAINT check_end_after_start CHECK (end_date > start_date)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_assignments_start_date ON public.assignments(start_date);
CREATE INDEX IF NOT EXISTS idx_assignments_end_date ON public.assignments(end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON public.assignments(created_by);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 모든 사용자는 숙제를 조회할 수 있음 (공개)
CREATE POLICY "Anyone can view assignments"
  ON public.assignments
  FOR SELECT
  USING (true);

-- 정책 생성: 인증된 사용자는 숙제를 등록할 수 있음
CREATE POLICY "Authenticated users can insert assignments"
  ON public.assignments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 정책 생성: 생성자만 숙제를 수정할 수 있음
CREATE POLICY "Users can update own assignments"
  ON public.assignments
  FOR UPDATE
  USING (auth.uid() = created_by);

-- 정책 생성: 생성자만 숙제를 삭제할 수 있음
CREATE POLICY "Users can delete own assignments"
  ON public.assignments
  FOR DELETE
  USING (auth.uid() = created_by);

-- assignments 테이블의 updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- homeworks 테이블 구조 업데이트
-- assignments 테이블과 연결하기 위해 assignment_id 컬럼 추가
-- ============================================

-- homeworks 테이블에 assignment_id 컬럼 추가
ALTER TABLE public.homeworks 
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE;

-- 기존 제약 조건 제거 (homework_number 기반, 존재하는 경우에만)
ALTER TABLE public.homeworks 
DROP CONSTRAINT IF EXISTS homeworks_user_id_homework_number_key;

-- 새로운 제약 조건: 같은 사용자의 같은 assignment는 하나만 제출 가능
-- 기존 제약 조건이 있으면 먼저 제거
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'homeworks' 
    AND constraint_name = 'unique_user_assignment'
  ) THEN
    ALTER TABLE public.homeworks DROP CONSTRAINT unique_user_assignment;
  END IF;
END $$;

-- 새로운 제약 조건 추가
ALTER TABLE public.homeworks 
ADD CONSTRAINT unique_user_assignment UNIQUE(user_id, assignment_id);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_homeworks_assignment_id ON public.homeworks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_user_assignment ON public.homeworks(user_id, assignment_id);

-- ============================================
-- profiles 테이블에 role 컬럼 추가 (기존 테이블 업데이트용)
-- ============================================

-- role 컬럼 추가 (이미 존재하는 경우 무시)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- role 컬럼에 대한 인덱스 추가 (관리자 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================
-- assignments 테이블에 강의자료 및 모범답안 URL 컬럼 추가
-- ============================================

-- 오늘의 강의자료 URL 컬럼 추가
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS lecture_material_url TEXT;

-- 지난과제 모범답안 URL 컬럼 추가
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS previous_answer_url TEXT;

-- ============================================
-- homeworks 테이블에 status 컬럼 추가
-- ============================================

-- status 컬럼 추가 (기본값: '검토중')
ALTER TABLE public.homeworks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '검토중';

-- status 컬럼에 CHECK 제약 조건 추가 (유효한 값만 허용)
ALTER TABLE public.homeworks
DROP CONSTRAINT IF EXISTS check_status_valid;

ALTER TABLE public.homeworks
ADD CONSTRAINT check_status_valid 
CHECK (status IN ('검토중', '승인', '수정필요', '모범답안'));

-- 관리자가 다른 사용자의 제출물 상태를 수정할 수 있도록 RLS 정책 추가
CREATE POLICY "Admins can update all homework statuses"
  ON public.homeworks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
