-- 프로필 테이블 생성
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- profiles 테이블 생성
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  group_name TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
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
