import type { Metadata } from "next";
import LadderVotePanel from "@/app/_components/LadderVotePanel";

export const metadata: Metadata = {
  title: "투표",
  description: "투표를 만들고 참여하며 결과를 확인할 수 있습니다.",
};

export default function VotePage() {
  return (
    <div className="flex min-h-full justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 bg-white dark:bg-black">
        <LadderVotePanel variant="page" />
      </div>
    </div>
  );
}
