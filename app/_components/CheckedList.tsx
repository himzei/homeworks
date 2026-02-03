"use client";

import React from "react";

// 제출 회원 정보 타입 정의
interface SubmissionUser {
  userId: string;
  userName: string;
  submittedAt: string; // 제출 일시
  url: string; // 제출 URL
}

// 검토 상태 타입 정의
type SubmissionStatus = "검토중" | "승인" | "수정필요" | "모범답안";

interface CheckedListProps {
  // 관리자 권한 확인 상태
  isCheckingAdmin: boolean;
  isAdmin: boolean;
  // 과제 ID
  assignmentId: string;
  // 제출 회원 리스트
  submissions: SubmissionUser[] | undefined;
  // 로딩 상태
  isLoadingSubmissions: boolean;
  // 제출 상태 관리
  submissionStatuses: Record<string, SubmissionStatus>;
  setSubmissionStatuses: React.Dispatch<
    React.SetStateAction<Record<string, SubmissionStatus>>
  >;
  // 제출 상태 업데이트 함수
  updateSubmissionStatus: (
    userId: string,
    assignmentId: string,
    status: SubmissionStatus,
  ) => Promise<void>;
}

export default function CheckedList({
  isCheckingAdmin,
  isAdmin,
  assignmentId,
  submissions,
  isLoadingSubmissions,
  submissionStatuses,
  setSubmissionStatuses,
  updateSubmissionStatus,
}: CheckedListProps) {
  // 권한 확인 중일 때

  // 관리자가 아닐 때는 아무것도 렌더링하지 않음
  if (!isAdmin) {
    return null;
  }

  // 관리자일 때 제출 회원 리스트 표시
  return (
    <div className="my-4">
      <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
        제출한 회원 ({submissions?.length || 0}명)
      </h4>
      {isLoadingSubmissions ? (
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          제출 정보를 불러오는 중...
        </div>
      ) : submissions && submissions.length > 0 ? (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
          {submissions.map((submission, index) => (
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
                  value={submissionStatuses[submission.userId] || "검토중"}
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
                      assignmentId,
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
          ))}
        </div>
      ) : (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
          아직 제출한 회원이 없습니다.
        </div>
      )}
    </div>
  );
}
