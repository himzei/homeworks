import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-2xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-black dark:text-zinc-50 mb-4">
            사용자를 찾을 수 없습니다
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            요청하신 사용자 정보를 찾을 수 없습니다.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
