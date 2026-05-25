"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isApprovedMember,
  PROFILE_APPROVAL_STATUS,
} from "@/lib/profile-approval";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signup" | "login"; // 회원가입 또는 로그인 모드
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // 폼 초기화
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(null);
  };

  // 모달 닫기
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 회원가입 처리
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("이메일을 입력해주세요.");
      return;
    }

    // 기본 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        // 자주 발생하는 에러 메시지 한글화
        const message = signUpError.message;
        if (message.includes("already registered") || message.includes("already in use")) {
          setError("이미 가입된 이메일입니다. 로그인을 시도해주세요.");
        } else if (message.includes("Invalid email") || message.includes("invalid")) {
          setError("유효하지 않은 이메일 형식입니다.");
        } else if (message.includes("Password")) {
          setError(message);
        } else {
          setError(message || "회원가입 중 오류가 발생했습니다.");
        }
        return;
      }

      if (data.user) {
        // 세션이 있으면 즉시 로그인됨 (이메일 확인 불필요 설정) → 프로필로 이동
        if (data.session) {
          setSuccess(
            "회원가입이 완료되었습니다. 프로필을 입력한 뒤 관리자 승인을 기다려 주세요.",
          );
          setTimeout(() => {
            handleClose();
            router.push("/profile");
          }, 1500);
        } else {
          // 이메일 확인 필요 (Supabase에서 Confirm email 사용 시)
          setSuccess("이메일 확인 링크를 발송했습니다. 이메일을 확인해주세요.");
          setTimeout(() => handleClose(), 3000);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "회원가입 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 처리
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // profiles 테이블에서 현재 로그인한 유저가 있는지 확인
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, approval_status")
          .eq("id", data.user.id)
          .maybeSingle();

        // 프로필 없음 → 프로필 입력, 승인 대기/거절 → 안내 페이지
        let redirectPath = "/profile";
        if (profile) {
          if (profile.approval_status === PROFILE_APPROVAL_STATUS.rejected) {
            redirectPath = "/pending-approval?status=rejected";
          } else if (!isApprovedMember(profile)) {
            redirectPath = "/pending-approval";
          } else {
            redirectPath = "/homework";
          }
        }

        setSuccess("로그인 성공!");
        // 모달 닫기 후 적절한 페이지로 이동
        setTimeout(() => {
          handleClose();
          router.push(redirectPath);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {mode === "signup" ? "회원가입" : "로그인"}
          </h2>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={mode === "signup" ? handleSignUp : handleSignIn}>
          <div className="space-y-4">
            {/* 이메일 입력 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="최소 6자 이상"
              />
            </div>

            {/* 비밀번호 확인 (회원가입 시에만) */}
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                >
                  비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isLoading
              ? "처리 중..."
              : mode === "signup"
                ? "회원가입"
                : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
