"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

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
          {/* 왼쪽 영역 (비어있음) */}
          <div className="flex-1"></div>

          {/* 중앙 영역 - 과제제출 */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              과제제출
            </h1>
          </div>

          {/* 오른쪽 영역 - 회원가입, 로그인 버튼 또는 사용자 정보 */}
          <div className="flex-1 flex justify-end items-center gap-3">
            {isLoading ? (
              // 로딩 중
              <div className="px-4 py-2 text-sm text-zinc-500">로딩 중...</div>
            ) : user ? (
              // 로그인된 상태 - 이메일 정보 표시 및 프로필 페이지 이동
              <>
                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="font-medium">{user.email}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  로그아웃
                </button>
              </>
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