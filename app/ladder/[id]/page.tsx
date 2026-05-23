import type { Metadata } from "next";
import LadderGameDetail from "@/app/_components/LadderGameDetail";

export const metadata: Metadata = {
  title: "사다리게임",
};

type LadderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LadderDetailPage({
  params,
}: LadderDetailPageProps) {
  const { id } = await params;

  return (
    // 상세 페이지는 "한 화면 fit" 정책 → 메인 영역(1fr) 안에서 h-full 채우고 overflow 차단
    <div className="flex h-full w-full bg-zinc-50 font-sans dark:bg-black overflow-hidden">
      <div className="flex h-full w-full flex-col py-4 sm:py-6 px-4 sm:px-8 bg-white dark:bg-black overflow-hidden">
        <LadderGameDetail gameId={id} />
      </div>
    </div>
  );
}
