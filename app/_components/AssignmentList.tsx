"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/_components/ui/pagination";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";
import CheckedList from "./CheckedList";

// 숙제 데이터 타입 정의
interface Assignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
  submissionCount: number; // 제출한 학생 수
}

// 제출 회원 정보 타입 정의
interface SubmissionUser {
  userId: string;
  userName: string;
  submittedAt: string; // 제출 일시
  url: string; // 제출 URL
}

// 검토 상태 타입 정의
type SubmissionStatus = "검토중" | "승인" | "수정필요" | "모범답안";

// CheckedList와 동일: 과제별로 구분 (userId만 쓰면 다른 과제 상태가 덮어씀)
function submissionStatusKey(userId: string, assignmentId: string): string {
  return `${userId}-${assignmentId}`;
}

function normalizeDbStatus(
  raw: string | null | undefined,
): SubmissionStatus {
  const allowed: SubmissionStatus[] = ["검토중", "승인", "수정필요", "모범답안"];
  if (raw && (allowed as readonly string[]).includes(raw)) {
    return raw as SubmissionStatus;
  }
  return "검토중";
}

interface AssignmentListProps {
  assignments: Assignment[];
}

export default function AssignmentList({ assignments }: AssignmentListProps) {
  const router = useRouter();
  const supabase = createClient();

  // 전역 세션에서 관리자 권한 가져오기
  const { isAdmin, isCheckingAdmin } = useAdmin();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 페이지네이션 상태 (1페이지당 1개 항목)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 1; // 페이지당 항목 수

  // 각 과제별 제출 회원 정보를 저장하는 상태
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState<
    Record<string, SubmissionUser[]>
  >({});
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<
    Record<string, boolean>
  >({});

  // 각 제출물별 검토 상태를 저장하는 상태 (userId -> 상태)
  const [submissionStatuses, setSubmissionStatuses] = useState<
    Record<string, SubmissionStatus>
  >({});

  // assignments의 ID 배열을 메모이제이션 (의존성 배열 안정화를 위해)
  const assignmentIds = useMemo(
    () => assignments.map((a) => a.id).join(","),
    [assignments],
  );

  // assignments의 최신 값을 참조하기 위한 ref
  const assignmentsRef = useRef(assignments);
  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  // 각 과제의 제출 회원 정보 가져오는 함수
  const fetchSubmissions = useCallback(async () => {
    // 관리자가 아니면 실행하지 않음
    if (!isAdmin || isCheckingAdmin) return;

    // ref를 통해 최신 assignments 참조
    const currentAssignments = assignmentsRef.current;

    for (const assignment of currentAssignments) {
      setIsLoadingSubmissions((prev) => ({ ...prev, [assignment.id]: true }));

      try {
        // 해당 과제의 제출 정보 가져오기 (제출 순서로 정렬, status 컬럼 포함)
        const { data: homeworks, error: homeworksError } = await supabase
          .from("homeworks")
          .select("user_id, url, created_at, status")
          .eq("assignment_id", assignment.id)
          .order("created_at", { ascending: true }); // 제출 순서로 정렬

        if (homeworksError) {
          console.error(
            `과제 ${assignment.id} 제출 정보 조회 실패:`,
            homeworksError,
          );
          setSubmissionsByAssignment((prev) => ({
            ...prev,
            [assignment.id]: [],
          }));
          continue;
        }

        if (!homeworks || homeworks.length === 0) {
          setSubmissionsByAssignment((prev) => ({
            ...prev,
            [assignment.id]: [],
          }));
          setIsLoadingSubmissions((prev) => ({
            ...prev,
            [assignment.id]: false,
          }));
          continue;
        }

        // 각 제출의 사용자 정보 가져오기
        const userIds = homeworks.map((h) => h.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        if (profilesError) {
          console.error(`프로필 정보 조회 실패:`, profilesError);
        }

        // 제출 정보와 사용자 정보 결합
        const submissionUsers: SubmissionUser[] = homeworks.map((homework) => {
          const profile = profiles?.find((p) => p.id === homework.user_id);
          return {
            userId: homework.user_id,
            userName: profile?.name || "이름 없음",
            submittedAt: new Date(homework.created_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            url: homework.url,
          };
        });

        setSubmissionsByAssignment((prev) => ({
          ...prev,
          [assignment.id]: submissionUsers,
        }));

        // 상태 정보를 submissionStatuses에 설정 (복합 키 = CheckedList 조회와 일치)
        const statuses: Record<string, SubmissionStatus> = {};
        homeworks.forEach((homework) => {
          // DB에서 가져온 status로 표시 (없거나 값이 없으면 검토중)
          const key = submissionStatusKey(homework.user_id, assignment.id);
          statuses[key] = normalizeDbStatus(homework.status);
        });
        setSubmissionStatuses((prev) => ({ ...prev, ...statuses }));
      } catch (error) {
        console.error(`과제 ${assignment.id} 제출 정보 가져오기 오류:`, error);
        setSubmissionsByAssignment((prev) => ({
          ...prev,
          [assignment.id]: [],
        }));
      } finally {
        setIsLoadingSubmissions((prev) => ({
          ...prev,
          [assignment.id]: false,
        }));
      }
    }
  }, [assignmentIds, supabase, isAdmin, isCheckingAdmin]);

  // 관리자 권한은 전역 세션에서 관리하므로 별도 확인 불필요

  // assignments 변경 시 이전 제출 데이터 초기화 (과정 필터 변경 시)
  useEffect(() => {
    setSubmissionsByAssignment({});
    setSubmissionStatuses({});
  }, [assignmentIds]);

  // 컴포넌트 마운트 시 및 assignments 변경 시 제출 정보 가져오기 (관리자일 때만)
  useEffect(() => {
    // 관리자가 아니거나 권한 확인 중이면 실행하지 않음
    if (!isAdmin || isCheckingAdmin) {
      return;
    }

    // assignments가 있고 관리자 권한이 확인된 경우에만 실행
    if (assignments.length > 0) {
      fetchSubmissions();
    }
  }, [
    assignmentIds,
    fetchSubmissions,
    isAdmin,
    isCheckingAdmin,
    assignments.length,
  ]);

  // 특정 과제의 제출 정보만 다시 불러오는 함수
  const refreshAssignmentSubmissions = useCallback(
    async (assignmentId: string) => {
      if (!isAdmin || isCheckingAdmin) return;

      setIsLoadingSubmissions((prev) => ({ ...prev, [assignmentId]: true }));

      try {
        // 해당 과제의 제출 정보 가져오기 (status 컬럼 포함)
        const { data: homeworks, error: homeworksError } = await supabase
          .from("homeworks")
          .select("user_id, url, created_at, status")
          .eq("assignment_id", assignmentId)
          .order("created_at", { ascending: true });

        if (homeworksError) {
          console.error(
            `과제 ${assignmentId} 제출 정보 조회 실패:`,
            homeworksError,
          );
          return;
        }

        if (!homeworks || homeworks.length === 0) {
          setSubmissionsByAssignment((prev) => ({
            ...prev,
            [assignmentId]: [],
          }));
          setIsLoadingSubmissions((prev) => ({
            ...prev,
            [assignmentId]: false,
          }));
          return;
        }

        // 각 제출의 사용자 정보 가져오기
        const userIds = homeworks.map((h) => h.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        if (profilesError) {
          console.error(`프로필 정보 조회 실패:`, profilesError);
        }

        // 제출 정보와 사용자 정보 결합
        const submissionUsers: SubmissionUser[] = homeworks.map((homework) => {
          const profile = profiles?.find((p) => p.id === homework.user_id);
          return {
            userId: homework.user_id,
            userName: profile?.name || "이름 없음",
            submittedAt: new Date(homework.created_at).toLocaleString("ko-KR", {
              timeZone: "Asia/Seoul",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            url: homework.url,
          };
        });

        setSubmissionsByAssignment((prev) => ({
          ...prev,
          [assignmentId]: submissionUsers,
        }));

        // 상태 정보 업데이트 (복합 키 = CheckedList 조회와 일치)
        const statuses: Record<string, SubmissionStatus> = {};
        homeworks.forEach((homework) => {
          const key = submissionStatusKey(homework.user_id, assignmentId);
          statuses[key] = normalizeDbStatus(homework.status);
        });
        setSubmissionStatuses((prev) => ({ ...prev, ...statuses }));
      } catch (error) {
        console.error(`과제 ${assignmentId} 제출 정보 가져오기 오류:`, error);
      } finally {
        setIsLoadingSubmissions((prev) => ({
          ...prev,
          [assignmentId]: false,
        }));
      }
    },
    [supabase, isAdmin, isCheckingAdmin],
  );

  // 제출 상태를 서버 API를 통해 DB에 저장 (관리자 검증 + RLS/서비스롤)
  const updateSubmissionStatus = useCallback(
    async (userId: string, assignmentId: string, status: SubmissionStatus) => {
      const key = submissionStatusKey(userId, assignmentId);
      const previousStatus = submissionStatuses[key] || "검토중";

      try {
        const res = await fetch("/api/admin/homework-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, assignmentId, status }),
        });

        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!res.ok) {
          console.error("상태 업데이트 실패:", payload);
          setSubmissionStatuses((prev) => ({
            ...prev,
            [key]: previousStatus,
          }));
          alert(
            typeof payload?.error === "string"
              ? payload.error
              : "상태 저장에 실패했습니다.",
          );
          return;
        }

        setSubmissionStatuses((prev) => ({
          ...prev,
          [key]: status,
        }));
        await refreshAssignmentSubmissions(assignmentId);
      } catch (error) {
        console.error("상태 업데이트 중 오류:", error);
        setSubmissionStatuses((prev) => ({
          ...prev,
          [key]: previousStatus,
        }));
        alert("상태 저장 중 오류가 발생했습니다.");
      }
    },
    [submissionStatuses, refreshAssignmentSubmissions],
  );

  // 날짜와 시간을 포맷팅하는 함수
  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 페이지네이션 계산
  const totalPages = Math.max(1, Math.ceil(assignments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssignments = assignments.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // 페이지 변경 시 스크롤을 맨 위로 이동
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // assignments가 변경되면 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [assignments.length]);

  // 삭제 버튼 클릭 핸들러
  const handleDelete = async (assignmentId: string) => {
    if (!confirm("정말 이 숙제를 삭제하시겠습니까?")) {
      return;
    }

    setDeletingId(assignmentId);

    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) {
        console.error("삭제 오류:", error);
        alert(`삭제에 실패했습니다: ${error.message}`);
        setDeletingId(null);
        return;
      }

      // 성공 시 페이지 새로고침 및 제출 정보 갱신
      alert("삭제되었습니다.");
      // 삭제된 과제의 제출 정보 제거
      setSubmissionsByAssignment((prev) => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });
      router.refresh();
    } catch (error) {
      console.error("예상치 못한 오류:", error);
      alert("예상치 못한 오류가 발생했습니다.");
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* 데스크톱 테이블 헤더 - 모바일에서 숨김 */}
      <div className="hidden md:block bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          <div className="col-span-1">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              번호
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              게시 시작일
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              게시 종료일
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              숙제 제목
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              내용
            </span>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              제출
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-sm font-semibold text-black dark:text-zinc-50">
              관리
            </span>
          </div>
        </div>
      </div>

      {/* 테이블 본문 */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {assignments.length === 0 ? (
          // 숙제가 없을 때
          <div className="px-4 sm:px-6 py-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              등록된 숙제가 없습니다.
            </p>
          </div>
        ) : (
          // 숙제 목록 렌더링 (현재 페이지의 항목만)
          currentAssignments.map((assignment, index) => (
            <div
              key={assignment.id}
              className="divide-y divide-zinc-200 dark:divide-zinc-700"
            >
              {/* 모바일 카드 형태 - 데스크톱에서 숨김 */}
              <div className="md:hidden p-4 space-y-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        #{startIndex + index + 1}
                      </span>
                      <span className="text-sm font-semibold text-black dark:text-zinc-50">
                        {assignment.title}
                      </span>
                    </div>
                    {assignment.content && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">
                        {assignment.content}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400">시작:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatDateTime(assignment.startDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400">종료:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {formatDateTime(assignment.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400">제출:</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {assignment.submissionCount}명
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <a
                    href={`/assignment/edit/${assignment.id}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1 w-full"
                    >
                      수정
                    </Button>
                  </a>
                  <Button
                    onClick={() => handleDelete(assignment.id)}
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === assignment.id}
                    className="text-xs px-3 py-1 flex-1"
                  >
                    {deletingId === assignment.id ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              </div>

              {/* 데스크톱 테이블 행 - 모바일에서 숨김 */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                {/* 번호 */}
                <div className="col-span-1 flex items-center">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {startIndex + index + 1}
                  </span>
                </div>

                {/* 게시 시작일 */}
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {formatDateTime(assignment.startDate)}
                  </span>
                </div>

                {/* 게시 종료일 */}
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {formatDateTime(assignment.endDate)}
                  </span>
                </div>

                {/* 숙제 제목 */}
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {assignment.title}
                  </span>
                </div>

                {/* 내용 */}
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                    {assignment.content || "-"}
                  </span>
                </div>

                {/* 제출 학생 수 */}
                <div className="col-span-1 flex items-center">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {assignment.submissionCount}명
                  </span>
                </div>

                {/* 수정/삭제 버튼 — a 태그로 전체 페이지 로드 (클라이언트 네비게이션 시 Supabase 요청 멈춤 회피) */}
                <div className="col-span-2 flex items-center gap-2">
                  <a href={`/assignment/edit/${assignment.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1"
                    >
                      수정
                    </Button>
                  </a>
                  <Button
                    onClick={() => handleDelete(assignment.id)}
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === assignment.id}
                    className="text-xs px-3 py-1"
                  >
                    {deletingId === assignment.id ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              </div>

              {/* 제출 회원 리스트 - 관리자만 볼 수 있음 */}
              <div className="px-4 sm:px-6 py-4">
                <CheckedList
                  isCheckingAdmin={isCheckingAdmin}
                  isAdmin={isAdmin}
                  assignmentId={assignment.id}
                  submissions={submissionsByAssignment[assignment.id]}
                  isLoadingSubmissions={isLoadingSubmissions[assignment.id]}
                  submissionStatuses={submissionStatuses}
                  setSubmissionStatuses={setSubmissionStatuses}
                  updateSubmissionStatus={updateSubmissionStatus}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {assignments.length > 0 && totalPages > 1 && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 sm:px-6 py-4">
          <Pagination>
            <PaginationContent>
              {/* 이전 페이지 버튼 */}
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* 페이지 번호 버튼들 */}
              {(() => {
                const pages: (number | "ellipsis")[] = [];

                if (totalPages <= 7) {
                  // 페이지가 7개 이하일 경우 모두 표시
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // 페이지가 많을 경우 생략 표시
                  pages.push(1); // 첫 페이지

                  if (currentPage <= 4) {
                    // 현재 페이지가 앞쪽에 있을 때
                    for (let i = 2; i <= 5; i++) {
                      pages.push(i);
                    }
                    pages.push("ellipsis");
                    pages.push(totalPages);
                  } else if (currentPage >= totalPages - 3) {
                    // 현재 페이지가 뒤쪽에 있을 때
                    pages.push("ellipsis");
                    for (let i = totalPages - 4; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    // 현재 페이지가 중간에 있을 때
                    pages.push("ellipsis");
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(i);
                    }
                    pages.push("ellipsis");
                    pages.push(totalPages);
                  }
                }

                return pages.map((page, index) => {
                  if (page === "ellipsis") {
                    return (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                });
              })()}

              {/* 다음 페이지 버튼 */}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
