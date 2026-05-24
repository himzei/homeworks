-- 반·조 관리 게시판 (과정 중 변경 이력 보관)
CREATE TABLE IF NOT EXISTS public.class_role_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  group_name TEXT NOT NULL,
  class_president_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- {"1": "user-uuid", "2": "user-uuid"} 형태
  team_leaders JSONB NOT NULL DEFAULT '{}',
  team_count INTEGER NOT NULL DEFAULT 6 CHECK (team_count >= 1 AND team_count <= 20),
  -- 과정당 하나만 현재 적용(프로필 반영)
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_class_role_snapshots_group_name
  ON public.class_role_snapshots(group_name);
CREATE INDEX IF NOT EXISTS idx_class_role_snapshots_created_at
  ON public.class_role_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_class_role_snapshots_is_active
  ON public.class_role_snapshots(group_name, is_active)
  WHERE is_active = true;

-- 과정당 활성 스냅샷 1개
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_role_snapshots_one_active_per_group
  ON public.class_role_snapshots(group_name)
  WHERE is_active = true;

ALTER TABLE public.class_role_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view class role snapshots"
  ON public.class_role_snapshots;
DROP POLICY IF EXISTS "Admins can insert class role snapshots"
  ON public.class_role_snapshots;
DROP POLICY IF EXISTS "Admins can update class role snapshots"
  ON public.class_role_snapshots;
DROP POLICY IF EXISTS "Admins can delete class role snapshots"
  ON public.class_role_snapshots;

CREATE POLICY "Authenticated users can view class role snapshots"
  ON public.class_role_snapshots
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert class role snapshots"
  ON public.class_role_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update class role snapshots"
  ON public.class_role_snapshots
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

CREATE POLICY "Admins can delete class role snapshots"
  ON public.class_role_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_class_role_snapshots_updated_at ON public.class_role_snapshots;
CREATE TRIGGER set_class_role_snapshots_updated_at
  BEFORE UPDATE ON public.class_role_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.class_role_snapshots IS
  '반·조 관리 게시판 글 (과정 중 변경 이력). is_active=true 인 글이 profiles에 반영됨.';
