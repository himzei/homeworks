-- 자리배치도(seating_charts) 테이블
CREATE TABLE IF NOT EXISTS public.seating_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  group_name TEXT,
  row_count INTEGER NOT NULL CHECK (row_count > 0 AND row_count <= 30),
  col_count INTEGER NOT NULL CHECK (col_count > 0 AND col_count <= 30),
  -- 통로: 해당 열 번호(1-based) 뒤에 통로 삽입 (예: {2,4})
  aisle_after_columns INTEGER[] NOT NULL DEFAULT '{}',
  -- 좌석 배정: {"1-1": "홍길동", "2-3": "김철수"} 형태
  seat_assignments JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seating_charts_group_name ON public.seating_charts(group_name);
CREATE INDEX IF NOT EXISTS idx_seating_charts_created_by ON public.seating_charts(created_by);
CREATE INDEX IF NOT EXISTS idx_seating_charts_created_at ON public.seating_charts(created_at DESC);

ALTER TABLE public.seating_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view seating charts" ON public.seating_charts;
DROP POLICY IF EXISTS "Admins can insert seating charts" ON public.seating_charts;
DROP POLICY IF EXISTS "Admins can update seating charts" ON public.seating_charts;
DROP POLICY IF EXISTS "Admins can delete seating charts" ON public.seating_charts;

CREATE POLICY "Authenticated users can view seating charts"
  ON public.seating_charts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert seating charts"
  ON public.seating_charts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update seating charts"
  ON public.seating_charts
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

CREATE POLICY "Admins can delete seating charts"
  ON public.seating_charts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS set_seating_charts_updated_at ON public.seating_charts;
CREATE TRIGGER set_seating_charts_updated_at
  BEFORE UPDATE ON public.seating_charts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
