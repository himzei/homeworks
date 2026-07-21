-- 사다리게임: 특정 참가자끼리 같은 결과가 나오지 않도록 하는 제외 쌍
-- 예: [{"nameA":"김철수","nameB":"이영희"}]

ALTER TABLE public.ladder_games
  ADD COLUMN IF NOT EXISTS exclusion_pairs JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ladder_games.exclusion_pairs IS
  '같은 결과를 받지 않아야 하는 참가자 쌍 목록 [{"nameA":"...","nameB":"..."}]';
