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
import StudentEvaluationScoresSummary from "@/app/_components/StudentEvaluationScoresSummary";
import { isAbortError } from "@/lib/errors/is-abort-error";
import {
  fetchStudentEvaluationSummary,
  type StudentEvaluationSummary,
} from "@/lib/evaluation/fetch-student-evaluation-summary";

// 학생 프로필 타입 정의
export interface StudentConsultationProfile {
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

interface StudentConsultationDetailProps {
  student: StudentConsultationProfile;
}

/**
 * 학생 상담 상세 (상담일지 목록·작성·수정)
 * - 관리자 전용 페이지 본문
 */
export default function StudentConsultationDetail({
  student,
}: StudentConsultationDetailProps) {
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

  // 성적 요약 (시험·프로젝트·과제)
  const [evaluationSummary, setEvaluationSummary] =
    useState<StudentEvaluationSummary | null>(null);
  const [isLoadingEvaluationSummary, setIsLoadingEvaluationSummary] =
    useState<boolean>(false);
  const [evaluationSummaryError, setEvaluationSummaryError] = useState<
    string | null
  >(null);

  // 학생이 변경되면 상담일지·성적 요약 불러오기
  useEffect(() => {
    if (isCheckingAdmin) return;

    if (!isAdmin) {
      setError("관리자만 상담일지를 조회할 수 있습니다.");
      return;
    }

    fetchConsultationLogs();
    fetchEvaluationSummary();

    return () => {
      resetForm();
      resetEditForm();
      setLogs([]);
      setEvaluationSummary(null);
      setEvaluationSummaryError(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, isAdmin, isCheckingAdmin]);

  // 평가 그리드와 동일 기준의 시험·프로젝트·과제 점수
  const fetchEvaluationSummary = async () => {
    if (!isAdmin) return;

    setIsLoadingEvaluationSummary(true);
    setEvaluationSummaryError(null);

    try {
      const summary = await fetchStudentEvaluationSummary(
        supabase,
        student.id,
        student.group_name,
      );
      setEvaluationSummary(summary);
    } catch (fetchError) {
      if (isAbortError(fetchError)) return;
      console.error("성적 요약 조회 실패:", fetchError);
      setEvaluationSummary(null);
      setEvaluationSummaryError("성적 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoadingEvaluationSummary(false);
    }
  };

  // 상담일지 목록 가져오기
  const fetchConsultationLogs = async () => {
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
        .order("consultation_date", { ascending: false });

      if (fetchError) {
        console.error("상담일지 조회 실패:", fetchError);
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
      if (isAbortError(err)) return;
      console.error("상담일지 가져오기 중 오류:", err);
      setError("상담일지를 불러오는 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const resetForm = () => {
    setConsultationDate(new Date().toISOString().slice(0, 16));
    setContent("");
    setNotes("");
    setIsWriting(false);
    setError(null);
  };

  const resetEditForm = () => {
    setEditingLogId(null);
    setEditConsultationDate("");
    setEditContent("");
    setEditNotes("");
    setError(null);
  };

  const startEdit = (log: ConsultationLog) => {
    if (isWriting) {
      resetForm();
    }

    setEditingLogId(log.id);
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

  const cancelEdit = () => {
    resetEditForm();
  };

  const handleUpdate = async (logId: string) => {
    if (!isAdmin) {
      setError("관리자만 상담일지를 수정할 수 있습니다.");
      return;
    }

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

      await fetchConsultationLogs();
      resetEditForm();
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("상담일지 수정 중 오류:", err);
      setError("상담일지 수정 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!isAdmin) {
      setError("관리자만 상담일지를 삭제할 수 있습니다.");
      return;
    }

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

      await fetchConsultationLogs();
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("상담일지 삭제 중 오류:", err);
      setError("상담일지 삭제 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeletingLogId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError("관리자만 상담일지를 작성할 수 있습니다.");
      return;
    }

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

      await fetchConsultationLogs();
      resetForm();
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("상담일지 작성 중 오류:", err);
      setError("상담일지 작성 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-5 p-6 border-b border-zinc-200 dark:border-zinc-800">
        <Avatar size="lg" className="shrink-0 size-24! md:size-28!">
          {student.avatar_url ? (
            <AvatarImage
              src={student.avatar_url}
              alt={student.name || "학생"}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-2xl md:text-3xl font-medium">
            {student.name ? student.name.charAt(0).toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {student.name || "이름 없음"}
          </h2>
          {student.email ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {student.email}
            </p>
          ) : null}
        </div>
      </div>

      {/* 학생 정보 */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {student.group_name ? (
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                그룹:
              </span>{" "}
              <span className="text-sm text-black dark:text-zinc-50">
                {student.group_name}
              </span>
            </div>
          ) : null}
          {student.phone ? (
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                전화번호:
              </span>{" "}
              <span className="text-sm text-black dark:text-zinc-50">
                {student.phone}
              </span>
            </div>
          ) : null}
          {student.university ? (
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                대학교:
              </span>{" "}
              <span className="text-sm text-black dark:text-zinc-50">
                {student.university}
              </span>
            </div>
          ) : null}
          {student.major ? (
            <div>
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                전공:
              </span>{" "}
              <span className="text-sm text-black dark:text-zinc-50">
                {student.major}
              </span>
            </div>
          ) : null}
          {student.github_url ? (
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
          ) : null}
          {student.bio ? (
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                자기소개:
              </span>
              <p className="text-sm text-black dark:text-zinc-50 mt-1">
                {student.bio}
              </p>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="mt-4">
            <StudentEvaluationScoresSummary
              summary={evaluationSummary}
              isLoading={isLoadingEvaluationSummary || isCheckingAdmin}
              loadError={evaluationSummaryError}
            />
          </div>
        ) : null}
      </div>

      {/* 상담일지 본문 */}
      <div className="p-6">
        {isCheckingAdmin ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            권한 확인 중...
          </div>
        ) : null}

        {!isCheckingAdmin && !isAdmin ? (
          <div className="text-center py-8">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300">
              관리자만 상담일지를 조회하고 작성할 수 있습니다.
            </div>
          </div>
        ) : null}

        {!isCheckingAdmin && isAdmin ? (
          <>
            {error ? (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : null}

            {!isWriting && !editingLogId ? (
              <div className="mb-6">
                <Button
                  onClick={() => {
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
            ) : null}

            {isWriting ? (
              <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
                  새 상담일지 작성
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
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
            ) : null}

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
                      {editingLogId !== log.id ? (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <div className="flex items-start justify-between">
                            <p className="text-xs text-zinc-500 dark:text-zinc-50">
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
                          <p className="text-sm text-black dark:text-zinc-50 whitespace-pre-wrap">
                            {log.content}
                          </p>
                          {log.notes ? (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                관리자 메모:
                              </p>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                {log.notes}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {editingLogId === log.id ? (
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
                                onChange={(e) => setEditContent(e.target.value)}
                                required
                                rows={6}
                                placeholder="상담 내용을 입력하세요"
                                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              />
                            </div>

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
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
