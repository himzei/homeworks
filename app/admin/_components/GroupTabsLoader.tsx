import { createClient } from "@/lib/supabase/server";
import { getCachedStudentCountsByGroup } from "@/lib/admin/student-counts-by-group";
import { fetchGroupOptions } from "@/lib/fetch-group-options";

import GroupTabs from "./GroupTabs";

type GroupTabsLoaderProps = {
  selectedGroup: string | null;
  /** 미전달 시 layout/React.cache로 집계한 기수별 학생 수 사용 */
  studentCountsByGroup?: Record<string, number>;
};

/**
 * 서버에서 과정 옵션·학생 수를 불러와 GroupTabs에 전달
 */
export default async function GroupTabsLoader({
  selectedGroup,
  studentCountsByGroup: studentCountsOverride,
}: GroupTabsLoaderProps) {
  const supabase = await createClient();

  const [groupOptions, studentCountsByGroup] = await Promise.all([
    fetchGroupOptions(supabase),
    studentCountsOverride
      ? Promise.resolve(studentCountsOverride)
      : getCachedStudentCountsByGroup(),
  ]);

  return (
    <GroupTabs
      selectedGroup={selectedGroup}
      studentCountsByGroup={studentCountsByGroup}
      groupOptions={groupOptions}
    />
  );
}
