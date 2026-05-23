"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/auth/SessionProvider";
import AuthModal from "./AuthModal";
import HeaderNav from "./HeaderNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** useSearchParams 사용 — Suspense 경계 필요 */
function HeaderNavWithSession({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean;
  isAdmin: boolean;
}) {
  return <HeaderNav isLoggedIn={isLoggedIn} isAdmin={isAdmin} />;
}

export default function Header() {
  const router = useRouter();

  const { user, profile, isLoading, isAdmin } = useSession();
  const supabase = createClient();

  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const isLoggedIn = Boolean(user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* 1행: 로고 + 계정 */}
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="min-w-0 shrink">
              <h1 className="text-base sm:text-lg font-semibold text-black dark:text-zinc-50 truncate hover:opacity-80 transition-opacity">
                AI 빅데이터 전문가 양성과정
              </h1>
              <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                과제관리
              </p>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isLoading ? (
                <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-zinc-500">
                  로딩 중...
                </div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 rounded-full"
                      aria-label="계정 메뉴"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-zinc-600">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.name || user.email || "사용자"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            {profile?.name
                              ? profile.name.charAt(0).toUpperCase()
                              : user.email
                                ? user.email.charAt(0).toUpperCase()
                                : "?"}
                          </div>
                        )}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                        {profile?.name || user.email || "사용자"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-medium leading-none truncate">
                        {user.email}
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (user?.id) router.push(`/user/${user.id}`);
                      }}
                      className="cursor-pointer"
                    >
                      프로필
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/profile")}
                      className="cursor-pointer"
                    >
                      계정 설정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/home")}
                      className="cursor-pointer"
                    >
                      과제 홈
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem
                        onClick={() => router.push("/admin")}
                        className="cursor-pointer"
                      >
                        관리자 대시보드
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSignupModalOpen(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    회원가입
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
                  >
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2행: 프로젝트 메뉴 */}
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            <Suspense
              fallback={
                <div className="h-9 text-sm text-zinc-400">메뉴 로딩...</div>
              }
            >
              <HeaderNavWithSession isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
            </Suspense>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        mode="signup"
      />

      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
      />
    </>
  );
}
