"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import HomeworkSubmission from "./HomeworkSubmission";
import { createClient } from "@/lib/supabase/client";

// 오늘의 숙제 데이터 타입 정의
interface TodayAssignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
  lectureMaterialUrl?: string | null; // 오늘의 강의자료 URL
  previousAnswerUrl?: string | null; // 지난과제 모범답안 URL
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

interface TodayAssignmentsProps {
  assignments: TodayAssignment[];
}

export default function TodayAssignments({
  assignments,
}: TodayAssignmentsProps) {
  const supabase = createClient();

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

  // 페이지 포커스 시 제출 정보 다시 가져오기 (제출 완료 후 자동 갱신, 관리자일 때만)
  useEffect(() => {
    if (!isAdmin || isCheckingAdmin) return;

    const handleFocus = () => {
      if (assignments.length > 0) {
        fetchSubmissions();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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

  if (assignments.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">
          현재 진행 중인 과제가 없습니다.
        </p>
      </div>
    );
  }

  // URL을 새 창에서 여는 함수
  const handleOpenUrl = (url: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="w-full space-y-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6"
        >
          {/* 강의자료 및 모범답안 버튼 (제목 위) */}
          {(assignment.lectureMaterialUrl || assignment.previousAnswerUrl) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {/* 오늘의 강의자료 버튼 */}
              {assignment.lectureMaterialUrl && (
                <button
                  onClick={() => handleOpenUrl(assignment.lectureMaterialUrl!)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  오늘의 강의자료
                </button>
              )}

              {/* 지난과제 모범답안 버튼 */}
              {assignment.previousAnswerUrl && (
                <button
                  onClick={() => handleOpenUrl(assignment.previousAnswerUrl!)}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  지난과제 모범답안
                </button>
              )}
            </div>
          )}

          {/* 숙제 제목 */}
          <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-3">
            {assignment.title}
          </h3>

          {/* 숙제 내용 */}
          {assignment.content && (
            <p className="text-zinc-600 dark:text-zinc-400 mb-4 whitespace-pre-wrap">
              {assignment.content}
            </p>
          )}

          {/* 기간 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            <div>
              <span className="font-medium">게시 시작:</span>{" "}
              {formatDateTime(assignment.startDate)}
            </div>
            <div>
              <span className="font-medium">게시 종료:</span>{" "}
              {formatDateTime(assignment.endDate)}
            </div>
          </div>
          {/* URL 제출 박스 */}
          <HomeworkSubmission assignmentId={assignment.id} />

          {/* 제출 회원 리스트 - 관리자만 볼 수 있음 */}
          {isCheckingAdmin ? (
            <div className="mb-4 mt-8">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                권한 확인 중...
              </div>
            </div>
          ) : isAdmin ? (
            <div className="mb-4 mt-8">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                제출한 회원 (
                {submissionsByAssignment[assignment.id]?.length || 0}
                명)
              </h4>
              {isLoadingSubmissions[assignment.id] ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  제출 정보를 불러오는 중...
                </div>
              ) : submissionsByAssignment[assignment.id]?.length > 0 ? (
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  {submissionsByAssignment[assignment.id].map(
                    (submission, index) => (
                      <div
                        key={submission.userId}
                        className="flex items-center justify-between text-sm border-b border-zinc-200 dark:border-zinc-700 pb-2 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium w-6 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                            {submission.userName}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs flex-shrink-0">
                            {submission.submittedAt}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={submission.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs ml-2 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            제출물 보기 →
                          </a>
                          {/* 검토 상태 선택 콤보박스 */}
                          <select
                            value={
                              submissionStatuses[submission.userId] || "검토중"
                            }
                            onChange={async (e) => {
                              const newStatus = e.target.value as SubmissionStatus;
                              // 낙관적 업데이트: 먼저 UI 업데이트
                              setSubmissionStatuses((prev) => ({
                                ...prev,
                                [submission.userId]: newStatus,
                              }));
                              // 데이터베이스에 저장하고 테이블 업데이트
                              await updateSubmissionStatus(
                                submission.userId,
                                assignment.id,
                                newStatus,
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex-shrink-0"
                          >
                            <option value="검토중">검토중</option>
                            <option value="승인">승인</option>
                            <option value="수정필요">수정필요</option>
                            <option value="모범답안">모범답안</option>
                          </select>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                  아직 제출한 회원이 없습니다.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
