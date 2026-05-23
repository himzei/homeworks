import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LadderGameForm from "@/app/_components/LadderGameForm";

export const metadata: Metadata = {
  title: "사다리게임 글쓰기",
  description: "참가자 인원수를 입력하고 사다리게임을 새로 만들어 보세요.",
};

export default function NewLadderPage() {
  return (
    <div className="flex min-h-full justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 bg-white dark:bg-black">
        <div className="space-y-6 max-w-3xl">
          <div className="space-y-2">
            <Link
              href="/ladder"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden />
              게시판
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
              사다리게임 글쓰기
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              인원 수를 입력하면 그 수에 맞춰 위쪽 참가자와 아래쪽 결과 칸이
              자동으로 만들어집니다.
            </p>
          </div>

          <LadderGameForm />
        </div>
      </div>
    </div>
  );
}
