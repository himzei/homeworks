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
-- profiles 테이블에 아바타 이미지 URL 컬럼 추가
-- ============================================

-- 아바타 이미지 URL 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================
-- profiles 테이블에 GitHub URL 컬럼 추가
-- ============================================

-- GitHub URL 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- ============================================
-- profiles 테이블에 대학교, 전공, 졸업여부 컬럼 추가
-- ============================================

-- 대학교 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS university TEXT;

-- 전공 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS major TEXT;

-- 졸업여부 컬럼 추가 (true: 졸업, false: 재학)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN DEFAULT false;

-- ============================================
-- Supabase Storage 버킷 생성 (수동으로 Supabase 대시보드에서 생성 필요)
-- ============================================
-- 참고: Supabase 대시보드 > Storage > New bucket에서 "avatars" 버킷을 생성하세요.
-- 버킷 설정:
--   - Public bucket: true (공개 버킷으로 설정)
--   - File size limit: 5MB
--   - Allowed MIME types: image/*
--
-- 또는 SQL로 생성하려면 다음 명령을 실행하세요:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
--
-- Storage 정책 생성 (사용자는 자신의 아바타만 업로드/삭제 가능):
-- CREATE POLICY "Users can upload own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can update own avatar"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can delete own avatar"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'avatars' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Anyone can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

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

-- ============================================
-- 학생 상담(Consultations) 테이블 생성
-- ============================================

-- consultations 테이블 생성
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL, -- 상담 내용
  status TEXT DEFAULT '대기중' NOT NULL, -- 상담 상태: '대기중', '진행중', '완료'
  admin_response TEXT, -- 관리자 답변 (선택적)
  responded_at TIMESTAMP WITH TIME ZONE, -- 관리자 답변 시간
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- status 컬럼에 CHECK 제약 조건 추가 (유효한 값만 허용)
  CONSTRAINT check_consultation_status_valid 
    CHECK (status IN ('대기중', '진행중', '완료'))
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_consultations_student_id ON public.consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations(created_at);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 학생은 자신의 상담만 조회 가능
CREATE POLICY "Students can view own consultations"
  ON public.consultations
  FOR SELECT
  USING (auth.uid() = student_id);

-- 정책 생성: 관리자는 모든 상담을 조회 가능
CREATE POLICY "Admins can view all consultations"
  ON public.consultations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 인증된 사용자는 자신의 상담을 등록할 수 있음
CREATE POLICY "Authenticated users can insert own consultations"
  ON public.consultations
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- 정책 생성: 학생은 자신의 상담만 수정 가능 (상담 내용 수정)
CREATE POLICY "Students can update own consultations"
  ON public.consultations
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 정책 생성: 관리자는 모든 상담의 상태와 답변을 수정할 수 있음
CREATE POLICY "Admins can update all consultations"
  ON public.consultations
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

-- consultations 테이블의 updated_at 자동 업데이트 트리거 생성
CREATE TRIGGER set_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 사용자 이메일 조회를 위한 RPC 함수 생성
-- ============================================

-- 여러 사용자의 이메일을 한 번에 조회하는 함수
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id::UUID as user_id,
    au.email::TEXT as email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- ============================================
-- 상담일지(Consultation Logs) 테이블 생성
-- 관리자가 학생과의 상담 내용을 기록하는 일지
-- ============================================

-- consultation_logs 테이블 생성
CREATE TABLE IF NOT EXISTS public.consultation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 상담 대상 학생 ID
  consultation_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 상담 일시
  content TEXT NOT NULL, -- 상담 내용
  notes TEXT, -- 관리자 메모 (선택적)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 작성한 관리자 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_consultation_logs_student_id ON public.consultation_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_consultation_date ON public.consultation_logs(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_created_by ON public.consultation_logs(created_by);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.consultation_logs ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Admins can view all consultation logs" ON public.consultation_logs;
DROP POLICY IF EXISTS "Admins can insert consultation logs" ON public.consultation_logs;
DROP POLICY IF EXISTS "Admins can update consultation logs" ON public.consultation_logs;
DROP POLICY IF EXISTS "Admins can delete consultation logs" ON public.consultation_logs;

-- 정책 생성: 관리자는 모든 상담일지를 조회 가능
CREATE POLICY "Admins can view all consultation logs"
  ON public.consultation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 관리자는 상담일지를 등록할 수 있음
CREATE POLICY "Admins can insert consultation logs"
  ON public.consultation_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 관리자는 상담일지를 수정할 수 있음
CREATE POLICY "Admins can update consultation logs"
  ON public.consultation_logs
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

-- 정책 생성: 관리자는 상담일지를 삭제할 수 있음
CREATE POLICY "Admins can delete consultation logs"
  ON public.consultation_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- consultation_logs 테이블의 updated_at 자동 업데이트 트리거 생성
DROP TRIGGER IF EXISTS set_consultation_logs_updated_at ON public.consultation_logs;
CREATE TRIGGER set_consultation_logs_updated_at
  BEFORE UPDATE ON public.consultation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 설문조사(Surveys) 테이블 생성
-- 관리자가 설문조사를 작성하고 관리하는 테이블
-- ============================================

-- surveys 테이블 생성
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, -- 설문조사 제목
  description TEXT, -- 설문조사 설명 (선택적)
  start_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 시작일과 시간
  end_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 종료일과 시간
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- 생성한 관리자 ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- 종료일은 시작일보다 이후여야 함
  CONSTRAINT check_survey_end_after_start CHECK (end_date > start_date)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_surveys_start_date ON public.surveys(start_date);
CREATE INDEX IF NOT EXISTS idx_surveys_end_date ON public.surveys(end_date);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON public.surveys(created_by);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Authenticated users can view surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Admins can delete surveys" ON public.surveys;

-- 정책 생성: 모든 인증된 사용자는 설문조사를 조회할 수 있음
CREATE POLICY "Authenticated users can view surveys"
  ON public.surveys
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 정책 생성: 관리자는 설문조사를 등록할 수 있음
CREATE POLICY "Admins can insert surveys"
  ON public.surveys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 관리자는 설문조사를 수정할 수 있음
CREATE POLICY "Admins can update surveys"
  ON public.surveys
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

-- 정책 생성: 관리자는 설문조사를 삭제할 수 있음
CREATE POLICY "Admins can delete surveys"
  ON public.surveys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- surveys 테이블의 updated_at 자동 업데이트 트리거 생성
DROP TRIGGER IF EXISTS set_surveys_updated_at ON public.surveys;
CREATE TRIGGER set_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 설문조사 응답(Survey Responses) 테이블 생성
-- 사용자가 설문조사에 응답한 내용을 저장하는 테이블
-- ============================================

-- survey_responses 테이블 생성
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL, -- 설문조사 ID
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 응답한 사용자 ID
  response_text TEXT NOT NULL, -- 응답 내용
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- 같은 사용자는 같은 설문조사에 한 번만 응답 가능
  UNIQUE(survey_id, user_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_user ON public.survey_responses(survey_id, user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Admins can view all survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated users can insert own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update own survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can delete own survey responses" ON public.survey_responses;

-- 정책 생성: 사용자는 자신의 응답만 조회 가능
CREATE POLICY "Users can view own survey responses"
  ON public.survey_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- 정책 생성: 관리자는 모든 응답을 조회 가능
CREATE POLICY "Admins can view all survey responses"
  ON public.survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 인증된 사용자는 자신의 응답을 등록할 수 있음
CREATE POLICY "Authenticated users can insert own survey responses"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 응답만 수정 가능
CREATE POLICY "Users can update own survey responses"
  ON public.survey_responses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 응답만 삭제 가능
CREATE POLICY "Users can delete own survey responses"
  ON public.survey_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 설문조사 질문(Survey Questions) 테이블 생성
-- 설문조사의 각 질문을 저장하는 테이블
-- ============================================

-- survey_questions 테이블 생성
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL, -- 설문조사 ID
  question_text TEXT NOT NULL, -- 질문 내용
  question_type TEXT NOT NULL, -- 질문 유형: 'multiple_choice' (다중선택), 'single_choice' (하나선택), 'text' (단답형)
  order_index INTEGER NOT NULL DEFAULT 0, -- 질문 순서
  is_required BOOLEAN DEFAULT true, -- 필수 질문 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- question_type에 CHECK 제약 조건 추가
  CONSTRAINT check_question_type_valid 
    CHECK (question_type IN ('multiple_choice', 'single_choice', 'text'))
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON public.survey_questions(survey_id, order_index);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Authenticated users can view survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can insert survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can update survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Admins can delete survey questions" ON public.survey_questions;

-- 정책 생성: 모든 인증된 사용자는 설문조사 질문을 조회할 수 있음
CREATE POLICY "Authenticated users can view survey questions"
  ON public.survey_questions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 정책 생성: 관리자는 설문조사 질문을 등록할 수 있음
CREATE POLICY "Admins can insert survey questions"
  ON public.survey_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 관리자는 설문조사 질문을 수정할 수 있음
CREATE POLICY "Admins can update survey questions"
  ON public.survey_questions
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

-- 정책 생성: 관리자는 설문조사 질문을 삭제할 수 있음
CREATE POLICY "Admins can delete survey questions"
  ON public.survey_questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 설문조사 질문 옵션(Survey Question Options) 테이블 생성
-- 다중선택/하나선택 질문의 선택지 옵션을 저장하는 테이블
-- ============================================

-- survey_question_options 테이블 생성
CREATE TABLE IF NOT EXISTS public.survey_question_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL, -- 질문 ID
  option_text TEXT NOT NULL, -- 옵션 텍스트
  order_index INTEGER NOT NULL DEFAULT 0, -- 옵션 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_survey_question_options_question_id ON public.survey_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_question_options_order ON public.survey_question_options(question_id, order_index);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.survey_question_options ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Authenticated users can view survey question options" ON public.survey_question_options;
DROP POLICY IF EXISTS "Admins can insert survey question options" ON public.survey_question_options;
DROP POLICY IF EXISTS "Admins can update survey question options" ON public.survey_question_options;
DROP POLICY IF EXISTS "Admins can delete survey question options" ON public.survey_question_options;

-- 정책 생성: 모든 인증된 사용자는 설문조사 질문 옵션을 조회할 수 있음
CREATE POLICY "Authenticated users can view survey question options"
  ON public.survey_question_options
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 정책 생성: 관리자는 설문조사 질문 옵션을 등록할 수 있음
CREATE POLICY "Admins can insert survey question options"
  ON public.survey_question_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 관리자는 설문조사 질문 옵션을 수정할 수 있음
CREATE POLICY "Admins can update survey question options"
  ON public.survey_question_options
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

-- 정책 생성: 관리자는 설문조사 질문 옵션을 삭제할 수 있음
CREATE POLICY "Admins can delete survey question options"
  ON public.survey_question_options
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 설문조사 질문 응답(Survey Question Responses) 테이블 생성
-- 사용자가 각 질문에 응답한 내용을 저장하는 테이블
-- ============================================

-- survey_question_responses 테이블 생성
CREATE TABLE IF NOT EXISTS public.survey_question_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL, -- 질문 ID
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- 응답한 사용자 ID
  option_id UUID REFERENCES public.survey_question_options(id) ON DELETE CASCADE, -- 선택한 옵션 ID (다중선택/하나선택용)
  response_text TEXT, -- 응답 텍스트 (단답형 또는 선택형의 경우 추가 텍스트)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- 같은 사용자는 같은 질문에 여러 번 응답 가능 (다중선택의 경우)
  -- 하지만 하나선택의 경우 한 번만 응답 가능하도록 애플리케이션 레벨에서 처리
  UNIQUE(question_id, user_id, option_id) -- 같은 옵션에 중복 응답 방지
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_survey_question_responses_question_id ON public.survey_question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_question_responses_user_id ON public.survey_question_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_question_responses_option_id ON public.survey_question_responses(option_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.survey_question_responses ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (이미 존재하는 경우)
DROP POLICY IF EXISTS "Users can view own survey question responses" ON public.survey_question_responses;
DROP POLICY IF EXISTS "Admins can view all survey question responses" ON public.survey_question_responses;
DROP POLICY IF EXISTS "Authenticated users can insert own survey question responses" ON public.survey_question_responses;
DROP POLICY IF EXISTS "Users can update own survey question responses" ON public.survey_question_responses;
DROP POLICY IF EXISTS "Users can delete own survey question responses" ON public.survey_question_responses;

-- 정책 생성: 사용자는 자신의 응답만 조회 가능
CREATE POLICY "Users can view own survey question responses"
  ON public.survey_question_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- 정책 생성: 관리자는 모든 응답을 조회 가능
CREATE POLICY "Admins can view all survey question responses"
  ON public.survey_question_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 정책 생성: 인증된 사용자는 자신의 응답을 등록할 수 있음
CREATE POLICY "Authenticated users can insert own survey question responses"
  ON public.survey_question_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 응답만 수정 가능
CREATE POLICY "Users can update own survey question responses"
  ON public.survey_question_responses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 정책 생성: 사용자는 자신의 응답만 삭제 가능
CREATE POLICY "Users can delete own survey question responses"
  ON public.survey_question_responses
  FOR DELETE
  USING (auth.uid() = user_id);
