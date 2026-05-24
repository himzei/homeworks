import { createClient } from "@/lib/supabase/server";
import { fetchGroupOptions } from "@/lib/fetch-group-options";

import GroupTabs from "./GroupTabs";

type GroupTabsLoaderProps = {
  selectedGroup: string | null;
  studentCountsByGroup?: Record<string, number>;
};

/**
 * 서버에서 과정 옵션을 불러와 GroupTabs에 전달
 */
export default async function GroupTabsLoader(props: GroupTabsLoaderProps) {
  const supabase = await createClient();
  const groupOptions = await fetchGroupOptions(supabase);

  return <GroupTabs {...props} groupOptions={groupOptions} />;
}
