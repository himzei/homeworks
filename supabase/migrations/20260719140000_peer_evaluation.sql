-- 동료평가: 관리자가 프로젝트 생성 → 동일 기수 학생이 서로 평가
-- 학생은 본인이 준 점수만 조회 가능 (받은 점수·타인 점수는 비공개)

CREATE TABLE IF NOT EXISTS public.peer_evaluation_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  group_name TEXT NOT NULL,
  -- draft: 준비중 / open: 평가 진행 / closed: 종료
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_peer_evaluation_projects_group_name
  ON public.peer_evaluation_projects (group_name);

CREATE INDEX IF NOT EXISTS idx_peer_evaluation_projects_status
  ON public.peer_evaluation_projects (status);

CREATE TABLE IF NOT EXISTS public.peer_evaluation_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL
    REFERENCES public.peer_evaluation_projects(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluatee_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 1~10점 척도
  score SMALLINT NOT NULL CHECK (score >= 1 AND score <= 10),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT peer_evaluation_ratings_unique_pair
    UNIQUE (project_id, evaluator_id, evaluatee_id),
  CONSTRAINT peer_evaluation_ratings_no_self
    CHECK (evaluator_id <> evaluatee_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_evaluation_ratings_project_id
  ON public.peer_evaluation_ratings (project_id);

CREATE INDEX IF NOT EXISTS idx_peer_evaluation_ratings_evaluator_id
  ON public.peer_evaluation_ratings (evaluator_id);

CREATE INDEX IF NOT EXISTS idx_peer_evaluation_ratings_evaluatee_id
  ON public.peer_evaluation_ratings (evaluatee_id);

ALTER TABLE public.peer_evaluation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_evaluation_ratings ENABLE ROW LEVEL SECURITY;

-- ---------- projects ----------

DROP POLICY IF EXISTS "Admins manage peer evaluation projects" ON public.peer_evaluation_projects;
DROP POLICY IF EXISTS "Members view open peer evaluation projects" ON public.peer_evaluation_projects;

-- 관리자: 전체 CRUD
CREATE POLICY "Admins manage peer evaluation projects"
  ON public.peer_evaluation_projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 승인 회원: 본인 기수의 open/closed 프로젝트만 조회
CREATE POLICY "Members view open peer evaluation projects"
  ON public.peer_evaluation_projects
  FOR SELECT
  USING (
    status IN ('open', 'closed')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approval_status = 'approved'
        AND (p.is_dormant IS DISTINCT FROM true)
        AND p.group_name IS NOT NULL
        AND p.group_name = peer_evaluation_projects.group_name
    )
  );

-- ---------- ratings ----------

DROP POLICY IF EXISTS "Admins manage peer evaluation ratings" ON public.peer_evaluation_ratings;
DROP POLICY IF EXISTS "Evaluators select own peer ratings" ON public.peer_evaluation_ratings;
DROP POLICY IF EXISTS "Evaluators insert own peer ratings" ON public.peer_evaluation_ratings;
DROP POLICY IF EXISTS "Evaluators update own peer ratings" ON public.peer_evaluation_ratings;
DROP POLICY IF EXISTS "Evaluators delete own peer ratings" ON public.peer_evaluation_ratings;

-- 관리자: 전체 (결과 취합용)
CREATE POLICY "Admins manage peer evaluation ratings"
  ON public.peer_evaluation_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 학생: 본인이 준 평가만 조회 (받은 점수·타인 점수는 절대 불가)
CREATE POLICY "Evaluators select own peer ratings"
  ON public.peer_evaluation_ratings
  FOR SELECT
  USING (auth.uid() = evaluator_id);

-- 학생: open 프로젝트·동일 기수·본인≠대상일 때만 작성
CREATE POLICY "Evaluators insert own peer ratings"
  ON public.peer_evaluation_ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = evaluator_id
    AND evaluator_id <> evaluatee_id
    AND EXISTS (
      SELECT 1
      FROM public.peer_evaluation_projects proj
      JOIN public.profiles evaluator ON evaluator.id = auth.uid()
      JOIN public.profiles evaluatee ON evaluatee.id = evaluatee_id
      WHERE proj.id = project_id
        AND proj.status = 'open'
        AND evaluator.approval_status = 'approved'
        AND (evaluator.is_dormant IS DISTINCT FROM true)
        AND evaluator.group_name IS NOT NULL
        AND evaluator.group_name = proj.group_name
        AND evaluatee.group_name = proj.group_name
        AND evaluatee.approval_status = 'approved'
        AND (evaluatee.is_dormant IS DISTINCT FROM true)
        AND (evaluatee.role IS DISTINCT FROM 'admin')
    )
  );

CREATE POLICY "Evaluators update own peer ratings"
  ON public.peer_evaluation_ratings
  FOR UPDATE
  USING (auth.uid() = evaluator_id)
  WITH CHECK (
    auth.uid() = evaluator_id
    AND evaluator_id <> evaluatee_id
    AND EXISTS (
      SELECT 1
      FROM public.peer_evaluation_projects proj
      WHERE proj.id = project_id
        AND proj.status = 'open'
    )
  );

CREATE POLICY "Evaluators delete own peer ratings"
  ON public.peer_evaluation_ratings
  FOR DELETE
  USING (
    auth.uid() = evaluator_id
    AND EXISTS (
      SELECT 1
      FROM public.peer_evaluation_projects proj
      WHERE proj.id = project_id
        AND proj.status = 'open'
    )
  );
