/** 네비게이션·탭 전환 등으로 요청이 취소됐을 때 발생하는 AbortError 여부 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (error.message.includes("signal is aborted")) return true;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { name?: string; code?: number; message?: string };
    if (record.name === "AbortError") return true;
    // DOM ABORT_ERR
    if (record.code === 20) return true;
    if (record.message?.includes("signal is aborted")) return true;
  }

  return false;
}
