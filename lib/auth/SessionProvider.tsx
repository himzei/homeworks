"use client";

import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// 세션 컨텍스트 타입 정의
interface SessionContextType {
  user: User | null;
  profile: { role?: string; [key: string]: any } | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCheckingAdmin: boolean;
}

// 세션 컨텍스트 생성
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// 세션 Provider 컴포넌트
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ role?: string; [key: string]: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Supabase 클라이언트를 메모이제이션하여 무한 루프 방지
  const supabase = useMemo(() => createClient(), []);
  const isInitialLoadRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    // isCheckingAdmin을 초기화하여 무한 로딩 방지
    setIsCheckingAdmin(true);

    // 초기 세션 및 프로필 로드
    const loadSession = async () => {
      try {
        // 사용자 정보 가져오기 (재시도 로직 포함)
        let currentUser = null;
        let userError = null;
        
        // 최대 2번 재시도
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await supabase.auth.getUser();
            currentUser = result.data.user;
            userError = result.error;
            
            // 성공하거나 재시도할 수 없는 에러면 중단
            if (!userError || attempt === 1) break;
            
            // 네트워크 에러나 일시적 에러인 경우에만 재시도
            if (
              userError.message?.includes("network") ||
              userError.message?.includes("timeout") ||
              userError.status === 0
            ) {
              // 짧은 대기 후 재시도
              await new Promise((resolve) => setTimeout(resolve, 100));
              continue;
            }
            
            break;
          } catch (err: any) {
            userError = err;
            if (attempt === 1) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // refresh token 에러 체크
        if (userError) {
          if (
            userError.message?.includes("Refresh Token") ||
            userError.message?.includes("refresh_token") ||
            userError.status === 401
          ) {
            console.warn("세션이 만료되었습니다. 자동 로그아웃합니다.");
            await supabase.auth.signOut();
          }
          
          if (isMountedRef.current) {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
            setIsLoading(false);
          }
          return;
        }

        if (!isMountedRef.current) {
          // 마운트 해제된 경우에도 isCheckingAdmin을 false로 설정
          setIsCheckingAdmin(false);
          return;
        }

        setUser(currentUser);

        // 프로필 정보 가져오기
        if (currentUser) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .single();

            if (profileError && profileError.code !== "PGRST116") {
              console.error("프로필 정보 가져오기 실패:", profileError);
            }

            if (isMountedRef.current) {
              setProfile(profileData || null);
              setIsAdmin(profileData?.role === "admin" || false);
              setIsCheckingAdmin(false);
            } else {
              // 마운트 해제된 경우에도 isCheckingAdmin을 false로 설정
              setIsCheckingAdmin(false);
            }
          } catch (profileErr) {
            console.error("프로필 조회 중 오류:", profileErr);
            if (isMountedRef.current) {
              setProfile(null);
              setIsAdmin(false);
              setIsCheckingAdmin(false);
            } else {
              setIsCheckingAdmin(false);
            }
          }
        } else {
          if (isMountedRef.current) {
            setProfile(null);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          } else {
            setIsCheckingAdmin(false);
          }
        }
      } catch (error: any) {
        console.error("세션 로드 실패:", error);
        if (isMountedRef.current) {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        } else {
          setIsCheckingAdmin(false);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          isInitialLoadRef.current = false;
          // finally 블록에서도 isCheckingAdmin을 false로 설정 (안전장치)
          setIsCheckingAdmin(false);
        } else {
          setIsCheckingAdmin(false);
        }
      }
    };

    loadSession();

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 초기 로드가 완료된 후에만 상태 업데이트
      if (!isInitialLoadRef.current && isMountedRef.current) {
        // 인증 상태 변경 시 isCheckingAdmin을 true로 설정하여 로딩 상태 표시
        setIsCheckingAdmin(true);
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            // 프로필 정보 다시 가져오기
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .single();

            if (profileError && profileError.code !== "PGRST116") {
              console.error("프로필 정보 가져오기 실패:", profileError);
            }

            if (isMountedRef.current) {
              setProfile(profileData || null);
              setIsAdmin(profileData?.role === "admin" || false);
              setIsCheckingAdmin(false);
            } else {
              setIsCheckingAdmin(false);
            }
          } catch (profileErr) {
            console.error("프로필 조회 중 오류:", profileErr);
            if (isMountedRef.current) {
              setProfile(null);
              setIsAdmin(false);
              setIsCheckingAdmin(false);
            } else {
              setIsCheckingAdmin(false);
            }
          }
        } else {
          if (isMountedRef.current) {
            setProfile(null);
            setIsAdmin(false);
            setIsCheckingAdmin(false);
          } else {
            setIsCheckingAdmin(false);
          }
        }
      }
    });

    // 페이지 가시성 변경 감지 (다른 탭에서 돌아올 때 세션 확인)
    const handleVisibilityChange = async () => {
      if (
        typeof window !== "undefined" &&
        document.visibilityState === "visible" &&
        isMountedRef.current
      ) {
        // 페이지가 다시 보일 때 세션 확인
        try {
          const { data: { user: currentUser }, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error("세션 확인 실패:", error);
            if (isMountedRef.current) {
              setUser(null);
              setProfile(null);
              setIsAdmin(false);
              setIsCheckingAdmin(false);
            }
            return;
          }

          if (isMountedRef.current) {
            setUser(currentUser);
            
            if (currentUser) {
              setIsCheckingAdmin(true);
              try {
                const { data: profileData, error: profileError } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", currentUser.id)
                  .single();

                if (profileError && profileError.code !== "PGRST116") {
                  console.error("프로필 정보 가져오기 실패:", profileError);
                }

                if (isMountedRef.current) {
                  setProfile(profileData || null);
                  setIsAdmin(profileData?.role === "admin" || false);
                  setIsCheckingAdmin(false);
                }
              } catch (profileErr) {
                console.error("프로필 조회 중 오류:", profileErr);
                if (isMountedRef.current) {
                  setProfile(null);
                  setIsAdmin(false);
                  setIsCheckingAdmin(false);
                }
              }
            } else {
              if (isMountedRef.current) {
                setProfile(null);
                setIsAdmin(false);
                setIsCheckingAdmin(false);
              }
            }
          }
        } catch (err) {
          console.error("세션 확인 중 오류:", err);
          if (isMountedRef.current) {
            setIsCheckingAdmin(false);
          }
        }
      }
    };

    // 페이지 가시성 변경 이벤트 리스너 등록 (클라이언트 사이드에서만)
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [supabase]);

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

// 세션 훅
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

// 관리자 권한 확인 훅
export function useAdmin() {
  const { isAdmin, isCheckingAdmin, isLoading } = useSession();
  return { isAdmin, isCheckingAdmin, isLoading };
}
