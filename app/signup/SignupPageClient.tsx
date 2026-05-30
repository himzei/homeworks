"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/app/_components/AuthForm";
import { useSession } from "@/lib/auth/SessionProvider";

export default function SignupPageClient() {
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [isLoading, user, router]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 dark:bg-black px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-sm">
        <AuthForm mode="signup" />
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
