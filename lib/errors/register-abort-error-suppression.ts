import { isAbortError } from "@/lib/errors/is-abort-error";

let isRegistered = false;

/**
 * 페이지 이동·탭 전환으로 취소된 fetch의 AbortError가
 * Next.js 개발 오버레이에 뜨지 않도록 전역에서 무시한다.
 */
export function registerAbortErrorSuppression(): void {
  if (typeof window === "undefined" || isRegistered) return;
  isRegistered = true;

  window.addEventListener("unhandledrejection", (event) => {
    if (isAbortError(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener("error", (event) => {
    // event.error가 없고 event.message만 있는 경우도 있음
    if (isAbortError(event.error) || isAbortError(event.message)) {
      event.preventDefault();
    }
  });
}
