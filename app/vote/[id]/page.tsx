import type { Metadata } from "next";
import VoteDetail from "@/app/_components/VoteDetail";

export const metadata: Metadata = {
  title: "투표",
};

type VoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VoteDetailPage({ params }: VoteDetailPageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-full justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 bg-white dark:bg-black">
        <VoteDetail voteId={id} />
      </div>
    </div>
  );
}
