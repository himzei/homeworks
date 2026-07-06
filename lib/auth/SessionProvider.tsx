"use client";

/* eslint-disable no-console -- 인증 디버깅용 에러 로깅 필요 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { registerAbortErrorSuppression } from "@/lib/errors/register-abort-error-suppression";
import { createClient } from "@/lib/supabase/client";
import { isAbortError } from "@/lib/errors/is-abort-error";
import { isSessionExpiredError } from "@/lib/auth/is-session-expired-error";
import type { User } from "@supabase/supabase-js";

registerAbortErrorSuppression();

/** SessionProvider가 노출하는 프로필 (profiles 테이블 행) */
export interface SessionProfile {
  role?: string;
  avatar_url?: string | null;
  name?: string | null;
  approval_status?: string | null;
  group_name?: string | null;
  [key: string]: string | null | undefined | number | boolean;
}

interface SessionContextType {
  user: User | null;
  profile: SessionProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCheckingAdmin: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const SESSION_RETRY_DELAY_MS = 300;
const MAX_SESSION_LOAD_RETRIES = 3;

/** 일시적 네트워크·타임아웃 오류 — 재시도 대상 */
function isRetryableAuthError(error: unknown): boolean {
  if (!error || isAbortError(error)) return true;
  if (isSessionExpiredError(error)) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string }).message ?? "")
        : "";

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: number }).status
      : undefined;

  return (
    status === 0 ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch")
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const isCheckingVisibilityRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const profileRef = useRef<SessionProfile | null>(null);
  const loadGenerationRef = useRef(0);

  const applyProfile = useCallback(
    (profileValue: SessionProfile | null) => {
      if (!isMountedRef.current) return;
      setProfile(profileValue);
      profileRef.current = profileValue;
      setIsAdmin(profileValue?.role === "admin");
      setIsCheckingAdmin(false);
    },
    [],
  );

  const clearSessionState = useCallback(() => {
    if (!isMountedRef.current) return;
    setUser(null);
    userRef.current = null;
    setProfile(null);
    profileRef.current = null;
    setIsAdmin(false);
    setIsCheckingAdmin(false);
  }, []);

  const applyUser = useCallback((currentUser: User | null) => {
    if (!isMountedRef.current) return;
    setUser(currentUser);
    userRef.current = currentUser;
  }, []);

  /** 프로필 조회 — 실패 시 기존 프로필 유지(동일 사용자) */
  const fetchProfileForUser = useCallback(
    async (currentUser: User): Promise<void> => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(
            "프로필 정보 가져오기 실패:",
            profileError?.message ?? profileError?.code ?? profileError,
          );
          // 동일 사용자의 기존 프로필이 있으면 유지
          if (profileRef.current && userRef.current?.id === currentUser.id) {
            setIsCheckingAdmin(false);
            return;
          }
          applyProfile(null);
          return;
        }

        applyProfile(profileData ?? null);
      } catch (profileErr) {
        if (isAbortError(profileErr)) {
          // abort 시 기존 프로필은 그대로 두되, 확인 중 상태는 해제해
          // 로딩 UI("권한을 확인하는 중...")가 무한히 멈추는 것을 방지
          if (profileRef.current && userRef.current?.id === currentUser.id) {
            setIsCheckingAdmin(false);
            return;
          }
          throw profileErr;
        }
        console.error(
          "프로필 조회 중 오류:",
          profileErr instanceof Error ? profileErr.message : profileErr,
        );
        if (profileRef.current && userRef.current?.id === currentUser.id) {
          setIsCheckingAdmin(false);
          return;
        }
        applyProfile(null);
      }
    },
    [applyProfile, supabase],
  );

  const loadSession = useCallback(
    async (retryCount = 0): Promise<void> => {
      const generation = ++loadGenerationRef.current;

      try {
        // 로컬 세션으로 먼저 UI 복구 (네비게이션 abort 시에도 쿠키 기반 표시)
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user ?? null;
        if (sessionUser && isMountedRef.current) {
          applyUser(sessionUser);
        }

        let currentUser: User | null = null;
        let userError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await supabase.auth.getUser();
            currentUser = result.data.user;
            userError = result.error;
            if (!userError || attempt === 1) break;
            if (isRetryableAuthError(userError)) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              continue;
            }
            break;
          } catch (err: unknown) {
            userError = err;
            if (isAbortError(err)) throw err;
            if (attempt === 1) break;
            if (isRetryableAuthError(err)) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              continue;
            }
            break;
          }
        }

        if (!isMountedRef.current || generation !== loadGenerationRef.current) {
          return;
        }

        if (userError) {
          if (isSessionExpiredError(userError)) {
            console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
            await supabase.auth.signOut();
            clearSessionState();
            return;
          }

          // 일시 오류 — 기존 세션이 있으면 유지
          if (userRef.current) {
            setIsCheckingAdmin(false);
            setIsLoading(false);
            return;
          }

          if (
            isRetryableAuthError(userError) &&
            retryCount < MAX_SESSION_LOAD_RETRIES
          ) {
            await new Promise((resolve) =>
              setTimeout(resolve, SESSION_RETRY_DELAY_MS),
            );
            if (isMountedRef.current) {
              return loadSession(retryCount + 1);
            }
            return;
          }

          clearSessionState();
          return;
        }

        applyUser(currentUser);

        if (currentUser) {
          setIsCheckingAdmin(true);
          await fetchProfileForUser(currentUser);
        } else {
          applyProfile(null);
        }
      } catch (error: unknown) {
        if (!isMountedRef.current || generation !== loadGenerationRef.current) {
          return;
        }

        if (isAbortError(error)) {
          // 빠른 페이지 이동 시 요청 취소 — 기존 세션 유지 후 재시도
          if (retryCount < MAX_SESSION_LOAD_RETRIES) {
            await new Promise((resolve) =>
              setTimeout(resolve, SESSION_RETRY_DELAY_MS),
            );
            if (isMountedRef.current) {
              return loadSession(retryCount + 1);
            }
          }
          if (userRef.current) {
            setIsCheckingAdmin(false);
          }
          return;
        }

        console.error("세션 로드 실패:", error);

        if (isSessionExpiredError(error)) {
          await supabase.auth.signOut().catch(() => {});
          clearSessionState();
          return;
        }

        if (userRef.current) {
          setIsCheckingAdmin(false);
          return;
        }

        if (
          isRetryableAuthError(error) &&
          retryCount < MAX_SESSION_LOAD_RETRIES
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, SESSION_RETRY_DELAY_MS),
          );
          if (isMountedRef.current) {
            return loadSession(retryCount + 1);
          }
          return;
        }

        clearSessionState();
      } finally {
        if (isMountedRef.current && generation === loadGenerationRef.current) {
          setIsLoading(false);
          isInitialLoadRef.current = false;
        }
      }
    },
    [
      applyUser,
      applyProfile,
      clearSessionState,
      fetchProfileForUser,
      supabase,
    ],
  );

  useEffect(() => {
    isMountedRef.current = true;
    setIsCheckingAdmin(true);
    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      const currentUser = session?.user ?? null;

      // 동일 사용자의 단순 토큰 갱신은 서버 상태에 영향이 없으므로 router.refresh 생략
      // (매 갱신마다 서버 재렌더 → 관리자 화면이 "권한을 확인하는 중..."으로 깜빡이는 문제 방지)
      const isSameUserTokenRefresh =
        event === "TOKEN_REFRESHED" &&
        !!currentUser &&
        currentUser.id === userRef.current?.id;

      if (
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED") &&
        !isSameUserTokenRefresh
      ) {
        router.refresh();
      }

      if (!isInitialLoadRef.current) {
        // 이미 같은 사용자의 프로필을 보유 중이면 재조회 없이 로딩만 해제
        // (토큰 갱신·탭 전환 등에서 로딩 UI가 반복 노출되는 것을 방지)
        if (
          currentUser &&
          currentUser.id === userRef.current?.id &&
          profileRef.current
        ) {
          applyUser(currentUser);
          setIsCheckingAdmin(false);
          return;
        }

        setIsCheckingAdmin(true);
        applyUser(currentUser);

        if (currentUser) {
          await fetchProfileForUser(currentUser);
        } else {
          applyProfile(null);
        }
      }
    });

    const handleVisibilityChange = async () => {
      if (
        isCheckingVisibilityRef.current ||
        typeof window === "undefined" ||
        document.visibilityState !== "visible" ||
        !isMountedRef.current
      ) {
        return;
      }

      isCheckingVisibilityRef.current = true;

      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          if (isSessionExpiredError(error)) {
            await supabase.auth.signOut();
            clearSessionState();
          }
          return;
        }

        if (
          currentUser?.id === userRef.current?.id &&
          profileRef.current
        ) {
          return;
        }

        applyUser(currentUser);

        if (currentUser) {
          setIsCheckingAdmin(true);
          await fetchProfileForUser(currentUser);
        } else {
          applyProfile(null);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          console.error("세션 확인 중 오류:", err);
        }
      } finally {
        isCheckingVisibilityRef.current = false;
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      loadGenerationRef.current += 1;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    applyUser,
    applyProfile,
    clearSessionState,
    fetchProfileForUser,
    loadSession,
    router,
    supabase,
  ]);

  const value: SessionContextType = {
    user,
    profile,
    isLoading,
    isAdmin,
    isCheckingAdmin,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

export function useAdmin() {
  const { isAdmin, isCheckingAdmin, isLoading } = useSession();
  return { isAdmin, isCheckingAdmin, isLoading };
}
