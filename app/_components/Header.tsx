"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

  // 모달 상태 관리
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 인증 상태 관리
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // 인증 상태 확인
  useEffect(() => {
    // 현재 사용자 정보 가져오기
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("사용자 정보 가져오기 실패:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="container mx-auto flex items-center justify-between h-16">
          {/* 왼쪽 영역 - 제목 (클릭 시 메인 페이지로 이동) */}
          <div className="flex-1">
            <Link href="/home">
              <h1 className="text-xl font-semibold text-black dark:text-zinc-50 cursor-pointer hover:opacity-80 transition-opacity">
                13기 기초교육과정 과제 관리
              </h1>
            </Link>
          </div>

          {/* 오른쪽 영역 - 회원가입, 로그인 버튼 또는 사용자 정보 */}
          <div className="flex-1 flex justify-end items-center gap-3">
            {isLoading ? (
              // 로딩 중
              <div className="px-4 py-2 text-sm text-zinc-500">로딩 중...</div>
            ) : user ? (
              // 로그인된 상태 - Avatar와 DropdownMenu 사용
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 rounded-full">
                    <Avatar>
                      <AvatarFallback className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
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
                    onClick={() => router.push("/profile")}
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
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
                >
                  회원가입
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
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
