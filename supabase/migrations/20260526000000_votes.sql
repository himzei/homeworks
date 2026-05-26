-- ============================================
-- 투표(Votes) 기능 - DB 저장 버전
-- - /vote 게시판에서 모든 승인된 회원이 조회/투표/결과 확인 가능
-- - 작성자는 draft 작성/시작/종료/삭제 및 진행 중 선택지 추가 가능
-- ============================================

-- 1) 투표 게시글
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  author_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT check_vote_status_valid CHECK (status IN ('draft', 'active', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_votes_created_at ON public.votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_author_user_id ON public.votes(author_user_id);
CREATE INDEX IF NOT EXISTS idx_votes_status ON public.votes(status);

-- 2) 선택지
CREATE TABLE IF NOT EXISTS public.vote_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON public.vote_options(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id_created_at ON public.vote_options(vote_id, created_at);

-- 3) 투표 기록 (1인 1표, 수정 가능)
CREATE TABLE IF NOT EXISTS public.vote_ballots (
  vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES public.vote_options(id) ON DELETE CASCADE NOT NULL,
  voter_name TEXT NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (vote_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vote_ballots_vote_id ON public.vote_ballots(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_ballots_option_id ON public.vote_ballots(option_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_ballots ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 (재실행 안전)
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.votes;
DROP POLICY IF EXISTS "Authors can view own draft votes" ON public.votes;
DROP POLICY IF EXISTS "Authenticated users can insert votes" ON public.votes;
DROP POLICY IF EXISTS "Authors can update own votes" ON public.votes;
DROP POLICY IF EXISTS "Authors can delete own votes" ON public.votes;

DROP POLICY IF EXISTS "Authenticated users can view vote options" ON public.vote_options;
DROP POLICY IF EXISTS "Authors can insert options for own votes" ON public.vote_options;
DROP POLICY IF EXISTS "Authors can delete options for own votes" ON public.vote_options;

DROP POLICY IF EXISTS "Authenticated users can view vote ballots" ON public.vote_ballots;
DROP POLICY IF EXISTS "Authenticated users can upsert own ballots" ON public.vote_ballots;

-- votes: 조회
-- - 진행/종료 투표는 모든 인증 사용자 조회 가능
-- - draft는 작성자만 조회 가능
CREATE POLICY "Authenticated users can view votes"
  ON public.votes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status <> 'draft' OR auth.uid() = author_user_id)
  );

-- votes: 생성 (인증 사용자)
CREATE POLICY "Authenticated users can insert votes"
  ON public.votes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = author_user_id);

-- votes: 수정 (작성자만)
CREATE POLICY "Authors can update own votes"
  ON public.votes
  FOR UPDATE
  USING (auth.uid() = author_user_id)
  WITH CHECK (auth.uid() = author_user_id);

-- votes: 삭제 (작성자만)
CREATE POLICY "Authors can delete own votes"
  ON public.votes
  FOR DELETE
  USING (auth.uid() = author_user_id);

-- vote_options: 조회 (연결된 vote 조회 권한과 동일)
CREATE POLICY "Authenticated users can view vote options"
  ON public.vote_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.votes v
      WHERE v.id = vote_options.vote_id
      AND auth.uid() IS NOT NULL
      AND (v.status <> 'draft' OR v.author_user_id = auth.uid())
    )
  );

-- vote_options: 삽입 (작성자만, vote 권한 체크)
CREATE POLICY "Authors can insert options for own votes"
  ON public.vote_options
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.votes v
      WHERE v.id = vote_options.vote_id
      AND v.author_user_id = auth.uid()
    )
  );

-- vote_ballots: 조회
-- - 종료(closed)된 투표는 모든 인증 사용자 조회 가능 (결과 공개)
-- - 진행(active) 중에는 본인 투표/작성자만 조회 가능
CREATE POLICY "Authenticated users can view vote ballots"
  ON public.vote_ballots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.votes v
      WHERE v.id = vote_ballots.vote_id
      AND auth.uid() IS NOT NULL
      AND (
        v.status = 'closed'
        OR v.author_user_id = auth.uid()
        OR vote_ballots.user_id = auth.uid()
      )
    )
  );

-- vote_ballots: upsert(INSERT/UPDATE) - 본인만
CREATE POLICY "Authenticated users can upsert own ballots"
  ON public.vote_ballots
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update own ballots"
  ON public.vote_ballots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

