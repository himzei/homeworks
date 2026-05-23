import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VoteForm from "@/app/_components/VoteForm";

export const metadata: Metadata = {
  title: "투표 글쓰기",
  description: "제목과 선택지를 입력하고 새 투표를 만들어 보세요.",
};

export default function NewVotePage() {
  return (
    <div className="flex min-h-full justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex min-h-full w-full container flex-col py-4 sm:py-8 px-4 sm:px-8 bg-white dark:bg-black">
        <div className="space-y-6 max-w-3xl">
          <div className="space-y-2">
            <Link
              href="/vote"
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
            >
              <ArrowLeft className="size-4" aria-hidden />
              게시판
            </Link>
            <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
              투표 글쓰기
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              제목과 선택지를 입력한 뒤 저장하면 상세 화면에서 투표를 시작할 수
              있습니다.
            </p>
          </div>

          <VoteForm />
        </div>
      </div>
    </div>
  );
}
