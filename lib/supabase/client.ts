import { createBrowserClient } from '@supabase/ssr'

// 전역 리스너가 이미 등록되었는지 확인하는 플래그
let isGlobalListenerRegistered = false
let globalSupabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 전역 인증 상태 변경 리스너 설정 (refresh token 에러 처리)
  // 한 번만 등록되도록 체크
  if (typeof window !== 'undefined' && !isGlobalListenerRegistered) {
    isGlobalListenerRegistered = true
    globalSupabaseInstance = supabase

    // 전역 unhandledrejection 에러 핸들러 (Promise rejection 처리)
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason
      const errorMessage = error?.message || String(error || '')
      
      // refresh token 에러 감지
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found') ||
        errorMessage.includes('refresh_token') ||
        error?.status === 401
      ) {
        // 에러를 조용히 처리 (콘솔에 출력하지 않음)
        event.preventDefault() // 기본 에러 출력 방지
        
        console.warn('세션이 만료되었습니다. 자동으로 세션을 정리합니다.')
        
        // 비동기로 세션 정리
        supabase.auth.signOut().catch(() => {
          // signOut 실패는 무시
        })
      }
    })

    // 전역 에러 핸들러 (일반 에러 처리)
    window.addEventListener('error', (event) => {
      const errorMessage = event.message || String(event.error || '')
      
      // refresh token 에러 감지
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Refresh Token Not Found') ||
        errorMessage.includes('refresh_token')
      ) {
        event.preventDefault() // 기본 에러 출력 방지
        
        console.warn('세션이 만료되었습니다. 자동으로 세션을 정리합니다.')
        
        // 비동기로 세션 정리
        supabase.auth.signOut().catch(() => {
          // signOut 실패는 무시
        })
      }
    })

    // 인증 상태 변경 리스너
    supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED 이벤트에서 에러가 발생할 수 있음
      if (event === 'TOKEN_REFRESHED' && !session) {
        // 토큰 갱신 실패 시 세션 정리
        console.warn('토큰 갱신에 실패했습니다. 자동 로그아웃합니다.')
        await supabase.auth.signOut().catch(() => {
          // signOut 실패는 무시
        })
      }
    })
  }

  return supabase
}