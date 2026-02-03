"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";

// 과제 데이터 타입 정의
interface Assignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
}

// 사용자 정보 타입 정의
interface User {
  id: string;
  name: string;
}

// 평가 상태 타입 정의
type EvaluationStatus = "미제출" | "검토중" | "수정필요" | "승인" | "모범답안";

// 평가 점수 매핑
const EVALUATION_SCORES: Record<EvaluationStatus, number> = {
  미제출: 0,
  검토중: 0,
  수정필요: 1,
  승인: 2,
  모범답안: 3,
};

interface EvaluationTabProps {
  assignments: Assignment[];
}

export default function EvaluationTab({ assignments }: EvaluationTabProps) {
  // Supabase 클라이언트를 메모이제이션하여 무한 루프 방지
  const supabase = useMemo(() => createClient(), []);

  // 전역 세션에서 관리자 권한 가져오기
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // 사용자 목록 상태
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  // 타임아웃 방지를 위한 ref
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // isCheckingAdmin이 너무 오래 true인 경우를 감지하기 위한 ref
  const checkingAdminTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 평가 상태 저장: { "userId-assignmentId": "미제출" | "수정필요" | "승인" | "모범답안" }
  const [evaluationStatuses, setEvaluationStatuses] = useState<
    Record<string, EvaluationStatus>
  >({});

  // 제출 정보 저장: { "userId-assignmentId": { url: string, submittedAt: string } }
  const [submissionData, setSubmissionData] = useState<
    Record<string, { url: string; submittedAt: string }>
  >({});

  // 관리자 권한은 전역 세션에서 관리하므로 별도 확인 불필요

  // 사용자 목록 가져오기 (관리자 제외)
  useEffect(() => {
    // 기존 타임아웃 클리어
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (checkingAdminTimeoutRef.current) {
      clearTimeout(checkingAdminTimeoutRef.current);
      checkingAdminTimeoutRef.current = null;
    }

    const fetchUsers = async () => {
      // 관리자가 아니거나 권한 확인 중이면 실행하지 않음
      if (!isAdmin || isCheckingAdmin) {
        // 관리자가 아닌 경우 로딩 상태 해제
        if (!isCheckingAdmin && !isAdmin) {
          setIsLoadingUsers(false);
        }
        // 권한 확인 중인 경우 타임아웃 설정 (5초 후 강제로 로딩 해제)
        if (isCheckingAdmin) {
          loadingTimeoutRef.current = setTimeout(() => {
            console.warn("관리자 권한 확인 타임아웃 - 로딩 상태 해제");
            setIsLoadingUsers(false);
          }, 5000);

          // isCheckingAdmin이 너무 오래 true인 경우를 감지 (10초 후 경고)
          checkingAdminTimeoutRef.current = setTimeout(() => {
            console.warn(
              "isCheckingAdmin이 10초 이상 true 상태입니다. 세션 확인에 문제가 있을 수 있습니다.",
            );
          }, 10000);
        }
        return;
      }

      try {
        setIsLoadingUsers(true);
        const { data: profilesData, error } = await supabase
          .from("profiles")
          .select("id, name, role")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("사용자 목록 조회 실패:", error);
          setIsLoadingUsers(false);
          return;
        }

        // 관리자가 아닌 사용자만 필터링
        const usersList: User[] =
          profilesData
            ?.filter((profile) => profile.role !== "admin")
            .map((profile) => ({
              id: profile.id,
              name: profile.name || "이름 없음",
            })) || [];

        setUsers(usersList);
      } catch (error) {
        console.error("사용자 목록 가져오기 중 오류:", error);
      } finally {
        setIsLoadingUsers(false);
        // 타임아웃 클리어
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    fetchUsers();

    // 클린업 함수: 컴포넌트 언마운트 시 타임아웃 클리어
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      if (checkingAdminTimeoutRef.current) {
        clearTimeout(checkingAdminTimeoutRef.current);
        checkingAdminTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isCheckingAdmin]); // supabase는 메모이제이션되어 있으므로 의존성에서 제외

  // 제출 정보 가져오기
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!isAdmin || isCheckingAdmin || assignments.length === 0) return;

      try {
        const assignmentIds = assignments.map((a) => a.id);
        const { data: homeworks, error } = await supabase
          .from("homeworks")
          .select("user_id, assignment_id, url, created_at, status")
          .in("assignment_id", assignmentIds);

        if (error) {
          console.error("제출 정보 조회 실패:", error);
          return;
        }

        // 제출 정보를 맵으로 변환
        const submissionsMap: Record<
          string,
          { url: string; submittedAt: string }
        > = {};

        homeworks?.forEach((homework) => {
          const key = `${homework.user_id}-${homework.assignment_id}`;
          submissionsMap[key] = {
            url: homework.url,
            submittedAt: new Date(homework.created_at).toLocaleString("ko-KR"),
          };
        });

        setSubmissionData(submissionsMap);

        // 제출된 과제의 상태를 데이터베이스에서 가져온 값으로 초기화
        const initialStatuses: Record<string, EvaluationStatus> = {};
        homeworks?.forEach((homework) => {
          const key = `${homework.user_id}-${homework.assignment_id}`;
          // 데이터베이스에서 가져온 상태가 있으면 사용하고, 없으면 기본값 "검토중"
          const status = (homework.status as EvaluationStatus) || "검토중";
          initialStatuses[key] = status;
        });

        if (Object.keys(initialStatuses).length > 0) {
          setEvaluationStatuses((prev) => ({ ...prev, ...initialStatuses }));
        }
      } catch (error) {
        console.error("제출 정보 가져오기 중 오류:", error);
      }
    };

    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isCheckingAdmin, assignments]); // supabase는 메모이제이션되어 있으므로 의존성에서 제외

  // 평가 상태 키 생성 함수
  const getEvaluationKey = (userId: string, assignmentId: string): string => {
    return `${userId}-${assignmentId}`;
  };

  // 특정 사용자의 특정 과제 평가 상태 가져오기
  const getEvaluationStatus = (
    userId: string,
    assignmentId: string,
  ): EvaluationStatus => {
    const key = getEvaluationKey(userId, assignmentId);
    return evaluationStatuses[key] || "미제출";
  };

  // 특정 사용자의 특정 과제 점수 가져오기
  const getScore = (userId: string, assignmentId: string): number => {
    const status = getEvaluationStatus(userId, assignmentId);
    return EVALUATION_SCORES[status];
  };

  // 특정 사용자의 총점 계산
  const getTotalScore = (userId: string): number => {
    return assignments.reduce((total, assignment) => {
      return total + getScore(userId, assignment.id);
    }, 0);
  };

  // 제출 상태를 데이터베이스에 저장하는 함수
  const updateEvaluationStatus = async (
    userId: string,
    assignmentId: string,
    status: EvaluationStatus,
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

      // 상태 업데이트 (미제출인 경우 null로 저장하지 않고 "검토중"으로 저장)
      const statusToSave = status === "미제출" ? "검토중" : status;
      const { error: updateError } = await supabase
        .from("homeworks")
        .update({ status: statusToSave })
        .eq("id", homework.id);

      if (updateError) {
        console.error("상태 업데이트 실패:", updateError);
        // 에러 발생 시 이전 상태로 되돌리기
        const previousStatus =
          evaluationStatuses[getEvaluationKey(userId, assignmentId)] ||
          "미제출";
        setEvaluationStatuses((prev) => ({
          ...prev,
          [getEvaluationKey(userId, assignmentId)]: previousStatus,
        }));
        return;
      }

      // 성공 시 로컬 상태 업데이트
      setEvaluationStatuses((prev) => ({
        ...prev,
        [getEvaluationKey(userId, assignmentId)]: status,
      }));
    } catch (error) {
      console.error("상태 업데이트 중 오류:", error);
      // 에러 발생 시 이전 상태로 되돌리기
      const previousStatus =
        evaluationStatuses[getEvaluationKey(userId, assignmentId)] || "미제출";
      setEvaluationStatuses((prev) => ({
        ...prev,
        [getEvaluationKey(userId, assignmentId)]: previousStatus,
      }));
    }
  };

  // CSV 파일 다운로드 함수
  const handleDownloadCSV = () => {
    // CSV 헤더 생성 (부분합을 이름 뒤로 이동)
    const headers = [
      "User / Assignment",
      "부분합",
      ...assignments.map((_, index) => `${index + 1}일차과제`),
    ];

    // CSV 데이터 행 생성 (부분합을 이름 뒤로 이동)
    const rows = users.map((user) => {
      const userScores = assignments.map((assignment) =>
        getScore(user.id, assignment.id),
      );
      const totalScore = getTotalScore(user.id);
      return [user.name, String(totalScore), ...userScores.map(String)];
    });

    // CSV 내용 생성
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // BOM 추가 (한글 깨짐 방지)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // 파일 다운로드
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `과제평가_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 그리드 열 템플릿 생성 (사용자 열 + 부분합 열 + 과제 열들)
  const gridCols = `200px 100px repeat(${assignments.length}, 120px)`;
  const totalCols = assignments.length + 2; // 사용자 열 + 부분합 열 + 과제 열들

  // 관리자 권한 확인 중이거나 사용자 목록 로딩 중일 때 로딩 표시
  // isCheckingAdmin이 false로 바뀌지 않으면 무한 로딩이 될 수 있으므로,
  // 타임아웃 처리는 useEffect에서 처리됨

  if (!isAdmin) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            평가 기능은 관리자만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
          과제 평가
        </h2>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          모든 과제의 제출물을 평가할 수 있습니다.
        </p>
      </div>

      {/* 범례 */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            범례:
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                검토중:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  0점
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                수정필요:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  1점
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                승인:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  2점
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                모범답안:{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  3점
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 평가 그리드 */}
      <div className="w-full bg-zinc-50 dark:bg-black rounded-lg p-6">
        {/* 가로 스크롤 가능한 컨테이너 */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* 그리드 컨테이너 */}
            <div
              className="inline-grid gap-3"
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* 헤더 셀 (왼쪽 상단) */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  User / Assignment
                </span>
              </div>

              {/* 부분합 헤더 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  부분합
                </span>
              </div>

              {/* 과제 헤더 행 */}
              {assignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                >
                  <span className="text-sm font-medium text-black dark:text-zinc-50 text-center">
                    {index + 1}일차과제
                  </span>
                </div>
              ))}

              {/* 사용자 행들 */}
              {users.map((user) => (
                <div
                  key={`user-row-${user.id}`}
                  style={{ display: "contents" }}
                >
                  {/* 사용자 이름 셀 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {user.name}
                    </span>
                  </div>

                  {/* 부분합 셀 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <span className="text-sm font-semibold text-black dark:text-zinc-50">
                      {getTotalScore(user.id)}점
                    </span>
                  </div>

                  {/* 각 과제별 평가 상태 셀 */}
                  {assignments.map((assignment) => {
                    const currentStatus = getEvaluationStatus(
                      user.id,
                      assignment.id,
                    );
                    const key = getEvaluationKey(user.id, assignment.id);
                    const hasSubmission = !!submissionData[key];

                    return (
                      <div
                        key={`${user.id}-${assignment.id}`}
                        className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[60px]"
                      >
                        {/* 상태 선택 콤보박스 */}
                        {hasSubmission ? (
                          <select
                            value={currentStatus}
                            onChange={async (e) => {
                              const newStatus = e.target
                                .value as EvaluationStatus;
                              // 낙관적 업데이트: 먼저 UI 업데이트
                              setEvaluationStatuses((prev) => ({
                                ...prev,
                                [key]: newStatus,
                              }));
                              // 데이터베이스에 저장
                              await updateEvaluationStatus(
                                user.id,
                                assignment.id,
                                newStatus,
                              );
                            }}
                            className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          >
                            <option value="검토중">검토중</option>
                            <option value="승인">승인</option>
                            <option value="수정필요">수정필요</option>
                            <option value="모범답안">모범답안</option>
                          </select>
                        ) : (
                          <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                            미제출
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSV 다운로드 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleDownloadCSV}
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          CSV 다운로드
        </button>
      </div>
    </div>
  );
}
