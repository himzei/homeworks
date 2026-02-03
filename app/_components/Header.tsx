"use client";

import { useState, useEffect, useRef } from "react";
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
  const [profile, setProfile] = useState<any>(null); // 프로필 정보 저장
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // 초기 로드 완료 여부를 추적하는 ref (클로저 문제 방지)
  const isInitialLoadRef = useRef(true);

  // 인증 상태 확인
  useEffect(() => {
    // 현재 사용자 정보 및 프로필 정보 가져오기
    const getUser = async () => {
      try {
        // 1. 인증된 사용자 정보 가져오기
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        // refresh token 에러 체크
        if (userError) {
          // refresh token 관련 에러인 경우 세션 정리
          if (
            userError.message?.includes("Refresh Token") ||
            userError.message?.includes("refresh_token") ||
            userError.status === 401
          ) {
            console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
            // 세션 정리
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return;
          }
          // 다른 에러인 경우
          console.error("사용자 정보 가져오기 실패:", userError);
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(user);

        // 2. 사용자가 로그인되어 있으면 프로필 정보 가져오기
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          // 프로필이 없어도 에러가 아니므로 (PGRST116은 데이터 없음 에러)
          if (profileError && profileError.code !== "PGRST116") {
            console.error("프로필 정보 가져오기 실패:", profileError);
          }

          // 프로필 데이터가 있으면 저장
          if (profileData) {
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error: any) {
        // refresh token 에러 체크
        if (
          error?.message?.includes("Refresh Token") ||
          error?.message?.includes("refresh_token") ||
          error?.status === 401
        ) {
          console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
          await supabase.auth.signOut();
        } else {
          console.error("사용자 정보 가져오기 실패:", error);
        }
        setUser(null);
        setProfile(null);
      } finally {
        // 초기 로드가 완료되면 로딩 상태 해제
        if (isInitialLoadRef.current) {
          setIsLoading(false);
          isInitialLoadRef.current = false; // 초기 로드 완료 표시
        }
      }
    };

    getUser();

    // 인증 상태 변경 감지 (초기 로드 이후의 변경사항만 처리)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // 초기 로드가 완료된 후에만 상태 업데이트
      if (!isInitialLoadRef.current) {
        setUser(session?.user ?? null);

        // 인증 상태가 변경되면 프로필 정보도 다시 가져오기
        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profileError && profileError.code !== "PGRST116") {
            console.error("프로필 정보 가져오기 실패:", profileError);
          }

          if (profileData) {
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
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
          <div className="flex-1 flex items-center gap-4">
            <Link href="/home">
              <h1 className="text-xl font-semibold text-black dark:text-zinc-50 cursor-pointer hover:opacity-80 transition-opacity">
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
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              과제제출방법
            </button>
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
                    {/* 아바타 이미지 표시 */}
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-zinc-600">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.name || user.email || "사용자"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          {profile?.name
                            ? profile.name.charAt(0).toUpperCase()
                            : user.email
                              ? user.email.charAt(0).toUpperCase()
                              : "?"}
                        </div>
                      )}
                    </div>
                    {/* 사용자 이름 또는 이메일 표시 */}
                    <span className="text-sm font-medium">
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
