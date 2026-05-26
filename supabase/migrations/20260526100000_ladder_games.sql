-- ============================================
-- 사다리게임(Ladder Games) - DB 저장 버전
-- - /ladder 게시판에서 승인된 모든 회원이 조회·작성·참여 가능
-- ============================================

CREATE TABLE IF NOT EXISTS public.ladder_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  participant_count INTEGER NOT NULL CHECK (participant_count >= 2 AND participant_count <= 35),
  participant_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  rungs JSONB NOT NULL DEFAULT '[]'::jsonb,
  diagonal_rungs JSONB NOT NULL DEFAULT '[]'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 32,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ladder_games_created_at ON public.ladder_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ladder_games_author_user_id ON public.ladder_games(author_user_id);

ALTER TABLE public.ladder_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ladder games" ON public.ladder_games;
DROP POLICY IF EXISTS "Authenticated users can insert ladder games" ON public.ladder_games;
DROP POLICY IF EXISTS "Authenticated users can update ladder games" ON public.ladder_games;
DROP POLICY IF EXISTS "Authenticated users can delete ladder games" ON public.ladder_games;

-- 승인된 회원(로그인) 모두 조회 가능
CREATE POLICY "Authenticated users can view ladder games"
  ON public.ladder_games
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 승인된 회원 모두 생성 가능
CREATE POLICY "Authenticated users can insert ladder games"
  ON public.ladder_games
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 승인된 회원 모두 수정 가능 (참가자 이름 추가·결과 편집 등 협업)
CREATE POLICY "Authenticated users can update ladder games"
  ON public.ladder_games
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 승인된 회원 모두 삭제 가능 (기존 UI와 동일)
CREATE POLICY "Authenticated users can delete ladder games"
  ON public.ladder_games
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
