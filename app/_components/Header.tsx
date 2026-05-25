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
  display = "all",
}: {
  isLoggedIn: boolean;
  display?: "all" | "desktop" | "mobile";
}) {
  return <HeaderNav isLoggedIn={isLoggedIn} display={display} />;
}

const navFallback = (
  <div className="h-10 text-base text-white/70">메뉴 로딩...</div>
);

/** 계정 영역 (로그인/아바타) */
function HeaderAccountSection({
  isLoading,
  user,
  profile,
  isAdmin,
  onSignup,
  onLogin,
  onLogout,
  onProfile,
  onSettings,
  onHome,
  onAdmin,
}: {
  isLoading: boolean;
  user: ReturnType<typeof useSession>["user"];
  profile: ReturnType<typeof useSession>["profile"];
  isAdmin: boolean;
  onSignup: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onHome: () => void;
  onAdmin: () => void;
}) {
  if (isLoading) {
    return (
      <div className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-brand-cream/60">
        로딩 중...
      </div>
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 sm:gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
            aria-label="계정 메뉴"
          >
            {/* 아바타 — 네이비 배경이므로 크림/흰색 테두리 */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-blue/40 flex items-center justify-center overflow-hidden border border-white/30">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.name || user.email || "사용자"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs sm:text-sm font-medium text-brand-cream">
                  {profile?.name
                    ? profile.name.charAt(0).toUpperCase()
                    : user.email
                      ? user.email.charAt(0).toUpperCase()
                      : "?"}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-brand-cream max-w-[120px] truncate">
              {profile?.name || user.email || "사용자"}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 data-[state=open]:zoom-in-100 data-[state=open]:slide-in-from-top-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-top-0"
        >
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium leading-none truncate">
              {user.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onProfile} className="cursor-pointer">
            프로필
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSettings} className="cursor-pointer">
            계정 설정
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onHome} className="cursor-pointer">
            과제 홈
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem onClick={onAdmin} className="cursor-pointer">
              관리자 대시보드
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            variant="destructive"
            className="cursor-pointer"
          >
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* 회원가입 — 투명 버튼 */}
      <button
        type="button"
        onClick={onSignup}
        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-brand-cream/80 hover:text-brand-cream transition-colors whitespace-nowrap"
      >
        회원가입
      </button>
      {/* 로그인 — 크림 배경, 네이비 텍스트 */}
      <button
        type="button"
        onClick={onLogin}
        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-brand-cream text-brand-navy rounded-lg hover:bg-white transition-colors whitespace-nowrap"
      >
        로그인
      </button>
    </>
  );
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
      {/* 헤더 — 진한 네이비 배경 */}
      <header className="shrink-0 border-b border-white/10 bg-brand-navy">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* 데스크톱: 로고 | 중앙 메뉴 | 계정 */}
          <div className="flex items-center gap-4">
            <Link href="/" className="min-w-0 flex-1 basis-0">
              <h1 className="text-base sm:text-lg font-semibold text-brand-cream truncate hover:opacity-80 transition-opacity">
                AI 빅데이터 전문가 양성과정
              </h1>
              <p className="hidden sm:block text-xs text-brand-cream/60 mt-0.5">
                과제관리
              </p>
            </Link>

            <div className="hidden md:flex shrink-0 justify-center">
              <Suspense fallback={navFallback}>
                <HeaderNavWithSession
                  isLoggedIn={isLoggedIn}
                  display="desktop"
                />
              </Suspense>
            </div>

            <div className="flex flex-1 basis-0 justify-end items-center gap-2 sm:gap-3 min-w-0">
              <HeaderAccountSection
                isLoading={isLoading}
                user={user}
                profile={profile}
                isAdmin={isAdmin}
                onSignup={() => setIsSignupModalOpen(true)}
                onLogin={() => setIsLoginModalOpen(true)}
                onLogout={handleLogout}
                onProfile={() => {
                  if (user?.id) router.push(`/user/${user.id}`);
                }}
                onSettings={() => router.push("/profile")}
                onHome={() => router.push("/home")}
                onAdmin={() => router.push("/admin")}
              />
            </div>
          </div>

          {/* 모바일: 햄버거 메뉴 */}
          <div className="md:hidden mt-3 pt-3 border-t border-white/10">
            <Suspense fallback={navFallback}>
              <HeaderNavWithSession isLoggedIn={isLoggedIn} display="mobile" />
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
