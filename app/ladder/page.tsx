import type { Metadata } from "next";

import LadderGameList from "@/app/_components/LadderGameList";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedMember } from "@/lib/auth/require-approved-member";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "사다리게임 게시판",
  description:
    "사다리게임을 게시판처럼 만들고 관리하세요. 글쓰기 버튼으로 새 사다리를 만들고, 목록에서 다시 열어볼 수 있습니다.",
};

export default async function LadderPage() {
  const supabase = await createClient();
  await requireApprovedMember(supabase);

  return (
    <div className="flex min-h-full justify-center">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8">
        <LadderGameList />
      </div>
    </div>
  );
}
