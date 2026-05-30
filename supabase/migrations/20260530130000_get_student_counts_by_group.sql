-- 관리자 탭 배지용: 기수별 활성 학생 수 집계 (그룹 미지정 인원은 각 기수 카운트에 합산)
CREATE OR REPLACE FUNCTION public.get_student_counts_by_group()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_unset int;
  v_result jsonb;
  r record;
BEGIN
  SELECT COUNT(*)::int
  INTO v_total
  FROM public.profiles
  WHERE role IS DISTINCT FROM 'admin'
    AND is_dormant = false;

  SELECT COUNT(*)::int
  INTO v_unset
  FROM public.profiles
  WHERE role IS DISTINCT FROM 'admin'
    AND is_dormant = false
    AND group_name IS NULL;

  v_result := jsonb_build_object('all', v_total);

  FOR r IN
    SELECT group_name, COUNT(*)::int AS cnt
    FROM public.profiles
    WHERE role IS DISTINCT FROM 'admin'
      AND is_dormant = false
      AND group_name IS NOT NULL
    GROUP BY group_name
  LOOP
    v_result := v_result || jsonb_build_object(r.group_name, r.cnt + v_unset);
  END LOOP;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_student_counts_by_group() IS
  '관리자 UI 탭: 과정별 학생 수(all 포함, 미지정 학생은 각 기수에 합산)';

GRANT EXECUTE ON FUNCTION public.get_student_counts_by_group() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_counts_by_group() TO service_role;
