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

interface AssignmentListProps {
  assignments: Assignment[];
}

export default function AssignmentList({ assignments }: AssignmentListProps) {
  const router = useRouter();
  const supabase = createClient();
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

  // 관리자 권한 확인 상태
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);

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

        // 상태 정보를 submissionStatuses에 설정
        const statuses: Record<string, SubmissionStatus> = {};
        homeworks.forEach((homework) => {
          // 데이터베이스에서 가져온 상태가 있으면 사용하고, 없으면 기본값 "검토중"
          statuses[homework.user_id] =
            (homework.status as SubmissionStatus) || "검토중";
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

  // 관리자 권한 확인 함수
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        // 현재 로그인한 사용자 정보 가져오기
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
          return;
        }

        // 프로필에서 역할 확인
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        // 관리자 역할 확인 (role이 'admin'인 경우)
        setIsAdmin(profile?.role === "admin");
      } catch (error) {
        console.error("관리자 권한 확인 실패:", error);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [supabase]);

  // 컴포넌트 마운트 시 및 assignments 변경 시 제출 정보 가져오기 (관리자일 때만)
  useEffect(() => {
    if (assignments.length > 0 && isAdmin && !isCheckingAdmin) {
      fetchSubmissions();
    }
  }, [assignmentIds, fetchSubmissions, isAdmin, isCheckingAdmin]);

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

        // 상태 정보 업데이트
        const statuses: Record<string, SubmissionStatus> = {};
        homeworks.forEach((homework) => {
          statuses[homework.user_id] =
            (homework.status as SubmissionStatus) || "검토중";
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

  // 제출 상태를 데이터베이스에 저장하는 함수
  const updateSubmissionStatus = useCallback(
    async (
      userId: string,
      assignmentId: string,
      status: SubmissionStatus,
    ) => {
      try {
        // 먼저 해당 사용자의 해당 과제 제출물 찾기
        const { data: homework, error: findError } = await supabase
          .from("homeworks")
          .select("id")
          .eq("user_id", userId)
          .eq("assignment_id", assignmentId)
          .single();

        if (findError || !homework) {
          console.error("제출물을 찾을 수 없습니다:", findError);
          return;
        }

        // 상태 업데이트
        const { error: updateError } = await supabase
          .from("homeworks")
          .update({ status })
          .eq("id", homework.id);

        if (updateError) {
          console.error("상태 업데이트 실패:", updateError);
          // 에러 발생 시 이전 상태로 되돌리기
          const previousStatus =
            submissionStatuses[userId] || "검토중";
          setSubmissionStatuses((prev) => ({
            ...prev,
            [userId]: previousStatus,
          }));
          return;
        }

        // 성공 시 로컬 상태 업데이트
        setSubmissionStatuses((prev) => ({
          ...prev,
          [userId]: status,
        }));

        // 해당 과제의 제출 정보 다시 불러오기 (테이블 업데이트)
        await refreshAssignmentSubmissions(assignmentId);
      } catch (error) {
        console.error("상태 업데이트 중 오류:", error);
        // 에러 발생 시 이전 상태로 되돌리기
        const previousStatus = submissionStatuses[userId] || "검토중";
        setSubmissionStatuses((prev) => ({
          ...prev,
          [userId]: previousStatus,
        }));
      }
    },
    [supabase, submissionStatuses, refreshAssignmentSubmissions],
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

  // 수정 버튼 클릭 핸들러
  const handleEdit = (assignmentId: string) => {
    router.push(`/assignment/edit/${assignmentId}`);
  };

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
      {/* 테이블 헤더 */}
      <div className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
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
          <div className="px-6 py-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              등록된 숙제가 없습니다.
            </p>
          </div>
        ) : (
          // 숙제 목록 렌더링 (현재 페이지의 항목만)
          currentAssignments.map((assignment, index) => (
            <div key={assignment.id} className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {/* 숙제 항목 행 */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
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

                {/* 수정/삭제 버튼 */}
                <div className="col-span-2 flex items-center gap-2">
                  <Button
                    onClick={() => handleEdit(assignment.id)}
                    variant="outline"
                    size="sm"
                    className="text-xs px-3 py-1"
                  >
                    수정
                  </Button>
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
              <div className="px-6 py-4">
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
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
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
