"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/_components/ui/avatar";
import { Button } from "@/app/_components/ui/button";

// 학생 프로필 타입 정의
interface StudentProfile {
  id: string;
  name: string;
  email: string | null;
  group_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  university: string | null;
  major: string | null;
  created_at: string;
}

// 상담일지 타입 정의
interface ConsultationLog {
  id: string;
  student_id: string;
  consultation_date: string;
  content: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile | null;
}

export default function StudentConsultationModal({
  isOpen,
  onClose,
  student,
}: StudentConsultationModalProps) {
  const supabase = createClient();

  // 관리자 권한 확인
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // 상담일지 목록 상태
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 상담일지 작성 폼 상태
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [consultationDate, setConsultationDate] = useState<string>(
    new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm 형식
  );
  const [content, setContent] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 수정 관련 상태
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editConsultationDate, setEditConsultationDate] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // 삭제 관련 상태
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 학생이 변경되면 상담일지 목록 불러오기
  useEffect(() => {
    // 관리자 권한 확인 중이면 대기
    if (isCheckingAdmin) return;

    // 관리자가 아니면 상담일지 조회 불가
    if (!isAdmin) {
      setError("관리자만 상담일지를 조회할 수 있습니다.");
      return;
    }

    if (isOpen && student) {
      fetchConsultationLogs();
    } else {
      // 모달이 닫히면 폼 초기화
      resetForm();
      resetEditForm();
      setLogs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student, isAdmin, isCheckingAdmin]);

  // 상담일지 목록 가져오기
  const fetchConsultationLogs = async () => {
    if (!student) return;

    // 관리자 권한 확인
    if (!isAdmin) {
      setError("관리자만 상담일지를 조회할 수 있습니다.");
      return;
    }

    try {
      setIsLoadingLogs(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("consultation_logs")
        .select("*")
        .eq("student_id", student.id)
        .order("consultation_date", { ascending: false }); // 최신순 정렬

      if (fetchError) {
        console.error("상담일지 조회 실패:", fetchError);
        // 에러 상세 정보 로깅
        console.error("에러 코드:", fetchError.code);
        console.error("에러 메시지:", fetchError.message);
        console.error("에러 상세:", fetchError.details);
        console.error("에러 힌트:", fetchError.hint);

        // RLS 정책 위반인 경우 명확한 메시지 표시
        if (
          fetchError.code === "42501" ||
          fetchError.message?.includes("policy")
        ) {
          setError("권한이 없습니다. 관리자 권한이 필요합니다.");
        } else {
          setError(
            `상담일지를 불러오는 중 오류가 발생했습니다: ${fetchError.message || "알 수 없는 오류"}`,
          );
        }
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error("상담일지 가져오기 중 오류:", err);
      setError("상담일지를 불러오는 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setConsultationDate(new Date().toISOString().slice(0, 16));
    setContent("");
    setNotes("");
    setIsWriting(false);
    setError(null);
  };

  // 수정 폼 초기화
  const resetEditForm = () => {
    setEditingLogId(null);
    setEditConsultationDate("");
    setEditContent("");
    setEditNotes("");
    setError(null);
  };

  // 수정 모드 시작
  const startEdit = (log: ConsultationLog) => {
    // 작성 모드가 열려있으면 먼저 닫기
    if (isWriting) {
      resetForm();
    }

    setEditingLogId(log.id);
    // 상담 일시를 datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    const date = new Date(log.consultation_date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    setEditConsultationDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    setEditContent(log.content);
    setEditNotes(log.notes || "");
  };

  // 수정 취소
  const cancelEdit = () => {
    resetEditForm();
  };

  // 상담일지 수정 제출
  const handleUpdate = async (logId: string) => {
    if (!student) return;

    // 관리자 권한 확인
    if (!isAdmin) {
      setError("관리자만 상담일지를 수정할 수 있습니다.");
      return;
    }

    // 유효성 검사
    if (!editContent.trim()) {
      setError("상담 내용을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("consultation_logs")
        .update({
          consultation_date: editConsultationDate,
          content: editContent.trim(),
          notes: editNotes.trim() || null,
        })
        .eq("id", logId);

      if (updateError) {
        console.error("상담일지 수정 실패:", updateError);
        console.error("에러 코드:", updateError.code);
        console.error("에러 메시지:", updateError.message);

        if (
          updateError.code === "42501" ||
          updateError.message?.includes("policy")
        ) {
          setError("권한이 없습니다. 관리자 권한이 필요합니다.");
        } else {
          setError(
            `상담일지 수정 중 오류가 발생했습니다: ${updateError.message || "알 수 없는 오류"}`,
          );
        }
        return;
      }

      // 성공 시 목록 새로고침 및 수정 폼 초기화
      await fetchConsultationLogs();
      resetEditForm();
    } catch (err) {
      console.error("상담일지 수정 중 오류:", err);
      setError("상담일지 수정 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 상담일지 삭제
  const handleDelete = async (logId: string) => {
    if (!student) return;

    // 관리자 권한 확인
    if (!isAdmin) {
      setError("관리자만 상담일지를 삭제할 수 있습니다.");
      return;
    }

    // 삭제 확인
    if (!confirm("정말 이 상담일지를 삭제하시겠습니까?")) {
      return;
    }

    setIsDeleting(true);
    setDeletingLogId(logId);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("consultation_logs")
        .delete()
        .eq("id", logId);

      if (deleteError) {
        console.error("상담일지 삭제 실패:", deleteError);
        console.error("에러 코드:", deleteError.code);
        console.error("에러 메시지:", deleteError.message);

        if (
          deleteError.code === "42501" ||
          deleteError.message?.includes("policy")
        ) {
          setError("권한이 없습니다. 관리자 권한이 필요합니다.");
        } else {
          setError(
            `상담일지 삭제 중 오류가 발생했습니다: ${deleteError.message || "알 수 없는 오류"}`,
          );
        }
        return;
      }

      // 성공 시 목록 새로고침
      await fetchConsultationLogs();
    } catch (err) {
      console.error("상담일지 삭제 중 오류:", err);
      setError("상담일지 삭제 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeletingLogId(null);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 상담일지 작성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    // 관리자 권한 확인
    if (!isAdmin) {
      setError("관리자만 상담일지를 작성할 수 있습니다.");
      return;
    }

    // 유효성 검사
    if (!content.trim()) {
      setError("상담 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("consultation_logs")
        .insert({
          student_id: student.id,
          consultation_date: consultationDate,
          content: content.trim(),
          notes: notes.trim() || null,
        });

      if (insertError) {
        console.error("상담일지 작성 실패:", insertError);
        console.error("에러 코드:", insertError.code);
        console.error("에러 메시지:", insertError.message);
        console.error("에러 상세:", insertError.details);
        console.error("에러 힌트:", insertError.hint);

        // RLS 정책 위반인 경우 명확한 메시지 표시
        if (
          insertError.code === "42501" ||
          insertError.message?.includes("policy")
        ) {
          setError("권한이 없습니다. 관리자 권한이 필요합니다.");
        } else {
          setError(
            `상담일지 작성 중 오류가 발생했습니다: ${insertError.message || "알 수 없는 오류"}`,
          );
        }
        return;
      }

      // 성공 시 목록 새로고침 및 폼 초기화
      await fetchConsultationLogs();
      resetForm();
    } catch (err) {
      console.error("상담일지 작성 중 오류:", err);
      setError("상담일지 작성 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="shrink-0">
              {student.avatar_url ? (
                <AvatarImage
                  src={student.avatar_url}
                  alt={student.name || "학생"}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-lg font-medium">
                {student.name ? student.name.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {student.name || "이름 없음"}
              </h2>
              {student.email && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {student.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-2xl font-light"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 학생 정보 섹션 */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.group_name && (
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  그룹:
                </span>{" "}
                <span className="text-sm text-black dark:text-zinc-50">
                  {student.group_name}
                </span>
              </div>
            )}
            {student.phone && (
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  전화번호:
                </span>{" "}
                <span className="text-sm text-black dark:text-zinc-50">
                  {student.phone}
                </span>
              </div>
            )}
            {/* 대학교 */}
            {student.university && (
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  대학교:
                </span>{" "}
                <span className="text-sm text-black dark:text-zinc-50">
                  {student.university}
                </span>
              </div>
            )}
            {/* 전공 */}
            {student.major && (
              <div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  전공:
                </span>{" "}
                <span className="text-sm text-black dark:text-zinc-50">
                  {student.major}
                </span>
              </div>
            )}
            {student.github_url && (
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  GitHub:
                </span>{" "}
                <a
                  href={student.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {student.github_url}
                </a>
              </div>
            )}
            {student.bio && (
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  자기소개:
                </span>
                <p className="text-sm text-black dark:text-zinc-50 mt-1">
                  {student.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 본문 영역 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 관리자 권한 확인 중 */}
          {isCheckingAdmin && (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              권한 확인 중...
            </div>
          )}

          {/* 관리자가 아닌 경우 */}
          {!isCheckingAdmin && !isAdmin && (
            <div className="text-center py-8">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300">
                관리자만 상담일지를 조회하고 작성할 수 있습니다.
              </div>
            </div>
          )}

          {/* 관리자인 경우에만 상담일지 기능 표시 */}
          {!isCheckingAdmin && isAdmin && (
            <>
              {/* 에러 메시지 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* 상담일지 작성 버튼 */}
              {!isWriting && !editingLogId && (
                <div className="mb-6">
                  <Button
                    onClick={() => {
                      // 수정 모드가 열려있으면 먼저 닫기
                      if (editingLogId) {
                        resetEditForm();
                      }
                      setIsWriting(true);
                    }}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    상담일지 작성하기
                  </Button>
                </div>
              )}

              {/* 상담일지 작성 폼 */}
              {isWriting && (
                <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                    새 상담일지 작성
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 상담 일시 */}
                    <div>
                      <label
                        htmlFor="consultationDate"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                      >
                        상담 일시 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="consultationDate"
                        type="datetime-local"
                        value={consultationDate}
                        onChange={(e) => setConsultationDate(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* 상담 내용 */}
                    <div>
                      <label
                        htmlFor="content"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                      >
                        상담 내용 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        rows={6}
                        placeholder="상담 내용을 입력하세요"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* 관리자 메모 */}
                    <div>
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                      >
                        관리자 메모 (선택사항)
                      </label>
                      <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        placeholder="추가 메모를 입력하세요"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="default"
                      >
                        {isSubmitting ? "저장 중..." : "저장하기"}
                      </Button>
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        disabled={isSubmitting}
                      >
                        취소
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* 상담일지 목록 */}
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                  상담일지 목록 ({logs.length})
                </h3>

                {isLoadingLogs ? (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    불러오는 중...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                    작성된 상담일지가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id}>
                        {/* 수정 모드가 아닌 경우 */}
                        {editingLogId !== log.id && (
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-start justify-between">
                              <p className="text-xs  text-zinc-500 dark:text-zinc-50">
                                {new Date(log.consultation_date).toLocaleString(
                                  "ko-KR",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </p>
                              {/* 수정/삭제 버튼 */}
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => startEdit(log)}
                                  variant="outline"
                                  size="sm"
                                  disabled={isDeleting}
                                >
                                  수정
                                </Button>
                                <Button
                                  onClick={() => handleDelete(log.id)}
                                  variant="destructive"
                                  size="sm"
                                  disabled={
                                    isDeleting && deletingLogId === log.id
                                  }
                                >
                                  {isDeleting && deletingLogId === log.id
                                    ? "삭제 중..."
                                    : "삭제"}
                                </Button>
                              </div>
                            </div>
                            <div className="">
                              <p className="text-sm text-black dark:text-zinc-50 whitespace-pre-wrap">
                                {log.content}
                              </p>
                            </div>
                            {log.notes && (
                              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  관리자 메모:
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                  {log.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 수정 모드인 경우 */}
                        {editingLogId === log.id && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                            <h4 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                              상담일지 수정
                            </h4>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleUpdate(log.id);
                              }}
                              className="space-y-4"
                            >
                              {/* 상담 일시 */}
                              <div>
                                <label
                                  htmlFor={`editConsultationDate-${log.id}`}
                                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                                >
                                  상담 일시{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  id={`editConsultationDate-${log.id}`}
                                  type="datetime-local"
                                  value={editConsultationDate}
                                  onChange={(e) =>
                                    setEditConsultationDate(e.target.value)
                                  }
                                  required
                                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>

                              {/* 상담 내용 */}
                              <div>
                                <label
                                  htmlFor={`editContent-${log.id}`}
                                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                                >
                                  상담 내용{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  id={`editContent-${log.id}`}
                                  value={editContent}
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  required
                                  rows={6}
                                  placeholder="상담 내용을 입력하세요"
                                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                              </div>

                              {/* 관리자 메모 */}
                              <div>
                                <label
                                  htmlFor={`editNotes-${log.id}`}
                                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
                                >
                                  관리자 메모 (선택사항)
                                </label>
                                <textarea
                                  id={`editNotes-${log.id}`}
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  rows={4}
                                  placeholder="추가 메모를 입력하세요"
                                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                              </div>

                              {/* 버튼 영역 */}
                              <div className="flex gap-3">
                                <Button
                                  type="submit"
                                  disabled={isUpdating}
                                  variant="default"
                                >
                                  {isUpdating ? "수정 중..." : "수정 완료"}
                                </Button>
                                <Button
                                  type="button"
                                  onClick={cancelEdit}
                                  variant="outline"
                                  disabled={isUpdating}
                                >
                                  취소
                                </Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
