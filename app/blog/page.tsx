import type { Metadata } from "next";
import Link from "next/link";
import { HOW_WORK_PATH } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "블로그",
  description:
    "빅데이터 전문가 양성과정 학습 노트, 실습 팁, 교육 소식을 확인할 수 있습니다.",
};

/** 블로그 목록 페이지 (추후 글 목록 연동 예정) */
export default function BlogPage() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="container max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
            빅데이터 전문가 양성과정
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            블로그
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            학습 노트, 실습 팁, 교육 소식을 모아두는 공간입니다.
          </p>
        </header>

        <section className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            아직 등록된 글이 없습니다. 곧 학습 자료와 교육 소식을 업데이트할
            예정입니다.
          </p>
          <Link
            href={HOW_WORK_PATH}
            className="inline-flex items-center gap-1 mt-6 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            과제 제출 방법 보러가기 →
          </Link>
        </section>
      </div>
    </div>
  );
}
