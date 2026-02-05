"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/auth/SessionProvider";
import AuthModal from "./AuthModal";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Header() {
  const router = useRouter();
  
  // 전역 세션에서 사용자 정보 가져오기
  const { user, profile, isLoading } = useSession();
  const supabase = createClient();

  // 모달 상태 관리
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 로그아웃 처리
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between min-h-16 py-3 sm:py-0 sm:h-16 px-4 sm:px-6 lg:px-8">
          {/* 왼쪽 영역 - 제목 (클릭 시 메인 페이지로 이동) */}
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link href="/home" className="w-full sm:w-auto">
              <h1 className="text-base sm:text-xl font-semibold text-black dark:text-zinc-50 cursor-pointer hover:opacity-80 transition-opacity">
                13기 기초교육과정 과제 관리
              </h1>
            </Link>
            {/* 과제제출방법 버튼 */}
            <button
              onClick={() => {
                window.open(
                  "https://himzei.notion.site/13-2fcd0a6ad3d780468f31c3eff7e9a23b?source=copy_link",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              과제제출방법
            </button>
          </div>

          {/* 오른쪽 영역 - 회원가입, 로그인 버튼 또는 사용자 정보 */}
          <div className="flex-1 sm:flex-none flex justify-start sm:justify-end items-center gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            {isLoading ? (
              // 로딩 중
              <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-zinc-500">로딩 중...</div>
            ) : user ? (
              // 로그인된 상태 - Avatar와 DropdownMenu 사용
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 sm:gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 rounded-full">
                    {/* 아바타 이미지 표시 */}
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
                    {/* 사용자 이름 또는 이메일 표시 - 모바일에서는 숨김 */}
                    <span className="hidden sm:inline text-sm font-medium">
                      {profile?.name || user.email || "사용자"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* 이메일 정보 표시 */}
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* 프로필 메뉴 */}
                  <DropdownMenuItem
                    onClick={() => {
                      // 현재 사용자의 ID로 유저 정보 페이지로 이동
                      if (user?.id) {
                        router.push(`/user/${user.id}`);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    프로필
                  </DropdownMenuItem>
                  {/* 과제 메뉴 */}
                  <DropdownMenuItem
                    onClick={() => router.push("/home")}
                    className="cursor-pointer"
                  >
                    과제
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* 로그아웃 메뉴 */}
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
              // 로그인되지 않은 상태 - 회원가입, 로그인 버튼
              <>
                <button
                  onClick={() => setIsSignupModalOpen(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors whitespace-nowrap"
                >
                  회원가입
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
                >
                  로그인
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 회원가입 모달 */}
      <AuthModal
        isOpen={isSignupModalOpen}
        onClose={() => setIsSignupModalOpen(false)}
        mode="signup"
      />

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode="login"
      />
    </>
  );
}
