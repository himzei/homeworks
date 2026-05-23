"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

interface DeleteStudentDialogProps {
  /** 다이얼로그 열림 여부 */
  isOpen: boolean;
  /** 다이얼로그 닫기 콜백 */
  onClose: () => void;
  /** 삭제 대상 학생 ID */
  studentId: string | null;
  /** 삭제 대상 학생 이름 (사용자 확인용) */
  studentName: string | null;
  /** 삭제 성공 후 콜백 (학생 ID 전달) */
  onDeleted: (deletedStudentId: string) => void;
}

/**
 * 회원 삭제 확인 다이얼로그
 *
 * - 실수로 삭제하는 것을 막기 위해 학생 이름을 직접 입력해야 활성화됨
 * - 삭제는 되돌릴 수 없음을 강조 표시
 * - ESC 키 / 백드롭 클릭으로 닫기 지원
 * - 진행 중 중복 클릭 방지
 */
export default function DeleteStudentDialog({
  isOpen,
  onClose,
  studentId,
  studentName,
  onDeleted,
}: DeleteStudentDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 다이얼로그가 열릴 때마다 입력값/에러 초기화 + 입력란 포커스
  useEffect(() => {
    if (isOpen) {
      setConfirmName("");
      setErrorMessage(null);
      // 한 프레임 뒤 포커스 (다이얼로그가 그려진 후)
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !studentId) return null;

  // 입력한 이름이 정확히 일치할 때만 삭제 활성화
  const isConfirmed =
    !!studentName && confirmName.trim() === studentName.trim();

  // 삭제 요청 실행
  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data?.error ?? "회원 삭제 중 오류가 발생했습니다.",
        );
        return;
      }

      // 성공 시 부모에 알리고 다이얼로그 닫기
      onDeleted(studentId);
      onClose();
    } catch (err) {
      console.error("회원 삭제 요청 실패:", err);
      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-student-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* 백드롭 */}
      <button
        type="button"
        aria-label="다이얼로그 닫기"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />

      {/* 다이얼로그 본문 */}
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="size-4" />
        </button>

        <div className="p-5 sm:p-6">
          {/* 헤더 */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
              <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="delete-student-title"
                className="text-base sm:text-lg font-semibold text-black dark:text-zinc-50"
              >
                회원 삭제 확인
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-black dark:text-zinc-50">
                  {studentName ?? "이 학생"}
                </span>{" "}
                회원을 정말 삭제하시겠습니까?
              </p>
            </div>
          </div>

          {/* 경고 박스 */}
          <div className="mt-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 p-3">
            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300">
              이 작업은 되돌릴 수 없으며, 해당 학생의{" "}
              <strong>프로필, 제출물, 상담일지, 설문 응답</strong> 등 모든
              데이터가 함께 삭제됩니다.
            </p>
          </div>

          {/* 이름 입력 확인 */}
          <div className="mt-4">
            <label
              htmlFor="confirm-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              계속하려면 학생 이름{" "}
              <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-black dark:text-zinc-50">
                {studentName}
              </span>{" "}
              을(를) 입력하세요.
            </label>
            <input
              ref={inputRef}
              id="confirm-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
              placeholder={studentName ?? ""}
              className="mt-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:opacity-60"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMessage ? (
            <p
              role="alert"
              className="mt-3 text-sm text-rose-600 dark:text-rose-400"
            >
              {errorMessage}
            </p>
          ) : null}

          {/* 액션 버튼 */}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "영구 삭제"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
