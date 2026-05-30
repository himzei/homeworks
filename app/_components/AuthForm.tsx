"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isApprovedMember,
  PROFILE_APPROVAL_STATUS,
} from "@/lib/profile-approval";

interface AuthFormProps {
  mode: "signup" | "login";
  /** 로그인 성공 후 이동할 경로 (미지정 시 프로필/과제 홈 등 자동 결정) */
  redirectTo?: string;
  /** 로그인 필요 안내 메시지 표시 여부 */
  showLoginRequiredNotice?: boolean;
}

export default function AuthForm({
  mode,
  redirectTo,
  showLoginRequiredNotice = false,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // 회원가입 처리
  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("이메일을 입력해주세요.");
      return;
    }

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
        const message = signUpError.message;
        if (
          message.includes("already registered") ||
          message.includes("already in use")
        ) {
          setError("이미 가입된 이메일입니다. 로그인을 시도해주세요.");
        } else if (
          message.includes("Invalid email") ||
          message.includes("invalid")
        ) {
          setError("유효하지 않은 이메일 형식입니다.");
        } else if (message.includes("Password")) {
          setError(message);
        } else {
          setError(message || "회원가입 중 오류가 발생했습니다.");
        }
        return;
      }

      if (data.user) {
        if (data.session) {
          setSuccess(
            "회원가입이 완료되었습니다. 프로필을 입력한 뒤 관리자 승인을 기다려 주세요.",
          );
          setTimeout(() => router.push("/profile"), 1500);
        } else {
          setSuccess("이메일 확인 링크를 발송했습니다. 이메일을 확인해주세요.");
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "회원가입 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 처리
  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (signInError) throw signInError;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, approval_status")
          .eq("id", data.user.id)
          .maybeSingle();

        let defaultRedirectPath = "/profile";
        if (profile) {
          if (profile.approval_status === PROFILE_APPROVAL_STATUS.rejected) {
            defaultRedirectPath = "/pending-approval?status=rejected";
          } else if (!isApprovedMember(profile)) {
            defaultRedirectPath = "/pending-approval";
          } else {
            defaultRedirectPath = "/homework";
          }
        }

        const nextPath = redirectTo || defaultRedirectPath;

        setSuccess("로그인 성공!");
        setTimeout(() => router.push(nextPath), 1000);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "로그인 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {mode === "signup" ? "회원가입" : "로그인"}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "signup"
            ? "계정을 만들고 과제 제출·학습 관리를 시작하세요."
            : "이메일과 비밀번호로 로그인하세요."}
        </p>
      </div>

      {showLoginRequiredNotice ? (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          로그인이 필요한 서비스입니다.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      ) : null}

      <form onSubmit={mode === "signup" ? handleSignUp : handleSignIn}>
        <div className="space-y-4">
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
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@email.com"
            />
          </div>

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
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="최소 6자 이상"
            />
          </div>

          {mode === "signup" ? (
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
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>
          ) : null}
        </div>

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

      <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "signup" ? (
          <>
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              로그인
            </Link>
          </>
        ) : (
          <>
            계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              회원가입
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
