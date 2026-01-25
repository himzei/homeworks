"use client";

import { Check, X } from "lucide-react";

// 과제 타입 정의
interface Assignment {
  id: string;
  name: string;
}

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
  section: "your" | "everyone"; // "YOUR PROGRESS" 또는 "EVERYONE'S PROGRESS"
}

// 진행 상태 타입 정의
type ProgressStatus = "completed" | "not_completed";

// 사용자별 과제 진행 상태 타입 정의
interface UserProgress {
  userId: string;
  assignmentId: string;
  status: ProgressStatus;
  url?: string; // 제출 URL 정보 (제출한 경우에만 존재)
  evaluationStatus?: string; // 평가 상태 (검토중, 승인, 수정필요, 모범답안)
}

interface ProgressGridProps {
  currentUserId: string; // 현재 로그인한 사용자 ID
  assignments: Assignment[];
  users: User[];
  progressData: UserProgress[];
}

export default function ProgressGrid({
  currentUserId,
  assignments,
  users,
  progressData,
}: ProgressGridProps) {
  // 특정 사용자의 특정 과제 진행 상태 가져오기
  const getProgressStatus = (userId: string, assignmentId: string): ProgressStatus => {
    const progress = progressData.find(
      (p) => p.userId === userId && p.assignmentId === assignmentId
    );
    return progress?.status || "not_completed";
  };

  // 특정 사용자의 특정 과제 제출 URL 가져오기
  const getSubmissionUrl = (userId: string, assignmentId: string): string | undefined => {
    const progress = progressData.find(
      (p) => p.userId === userId && p.assignmentId === assignmentId
    );
    return progress?.url;
  };

  // 특정 사용자의 특정 과제 평가 상태 가져오기
  const getEvaluationStatus = (userId: string, assignmentId: string): string | undefined => {
    const progress = progressData.find(
      (p) => p.userId === userId && p.assignmentId === assignmentId
    );
    return progress?.evaluationStatus;
  };

  // 평가 상태에 따른 배경색 및 텍스트 반환
  const getStatusStyle = (evaluationStatus?: string): { bgColor: string; text: string; textColor: string } => {
    switch (evaluationStatus) {
      case "검토중":
        return { bgColor: "bg-yellow-500", text: "검토중", textColor: "text-yellow-700 dark:text-yellow-300" };
      case "승인":
        return { bgColor: "bg-green-500", text: "승인", textColor: "text-green-700 dark:text-green-300" };
      case "수정필요":
        return { bgColor: "bg-orange-500", text: "수정필요", textColor: "text-orange-700 dark:text-orange-300" };
      case "모범답안":
        return { bgColor: "bg-blue-500", text: "모범답안", textColor: "text-blue-700 dark:text-blue-300" };
      default:
        return { bgColor: "bg-gray-400", text: "제출완료", textColor: "text-gray-700 dark:text-gray-300" };
    }
  };

  // 사용자를 섹션별로 분리
  const yourProgressUsers = users.filter((user) => user.section === "your");
  const everyoneProgressUsers = users.filter((user) => user.section === "everyone");

  // 그리드 열 템플릿 생성 (사용자 열 + 과제 열들)
  const gridCols = `200px repeat(${assignments.length}, 120px)`;
  const totalCols = assignments.length + 1; // 사용자 열 + 과제 열들

  return (
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

            {/* 과제 헤더 행 */}
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
              >
                <span className="text-sm font-medium text-black dark:text-zinc-50 text-center">
                  {assignment.name}
                </span>
              </div>
            ))}

            {/* YOUR PROGRESS 섹션 */}
            {yourProgressUsers.length > 0 && (
              <>
                {/* 섹션 헤더 */}
                <div
                  className="bg-transparent flex items-center"
                  style={{ gridColumn: `1 / ${totalCols + 1}` }}
                >
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    YOUR PROGRESS
                  </span>
                </div>

                {/* YOUR PROGRESS 사용자 행 */}
                {yourProgressUsers.map((user) => (
                  <div key={`your-user-row-${user.id}`} style={{ display: 'contents' }}>
                    {/* 사용자 이름 셀 */}
                    <div
                      className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                    >
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {user.name}
                      </span>
                    </div>

                    {/* 각 과제별 진행 상태 셀 */}
                    {assignments.map((assignment) => {
                      const status = getProgressStatus(user.id, assignment.id);
                      const submissionUrl = getSubmissionUrl(user.id, assignment.id);
                      const evaluationStatus = getEvaluationStatus(user.id, assignment.id);
                      const isCurrentUser = user.id === currentUserId;
                      const statusStyle = getStatusStyle(evaluationStatus);

                      return (
                        <div
                          key={`${user.id}-${assignment.id}`}
                          className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[60px]"
                        >
                          {status === "completed" ? (
                            isCurrentUser && submissionUrl ? (
                              // 현재 사용자이고 제출한 경우: 클릭 가능한 상태 표시
                              <a
                                href={submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-3 py-1 rounded-md ${statusStyle.bgColor} ${statusStyle.textColor} font-medium text-xs hover:opacity-80 transition-opacity cursor-pointer`}
                                title={`${statusStyle.text} - 클릭하여 제출물 보기`}
                              >
                                {statusStyle.text}
                              </a>
                            ) : (
                              // 다른 사용자이거나 URL이 없는 경우: 아이콘만 표시
                              <div className={`w-6 h-6 rounded-full ${statusStyle.bgColor} flex items-center justify-center`}>
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )
                          ) : (
                            // 미제출 상태
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* EVERYONE'S PROGRESS 섹션 */}
            {everyoneProgressUsers.length > 0 && (
              <>
                {/* 섹션 헤더 */}
                <div
                  className="bg-transparent flex items-center mt-4"
                  style={{ gridColumn: `1 / ${totalCols + 1}` }}
                >
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    EVERYONE'S PROGRESS
                  </span>
                </div>

                {/* EVERYONE'S PROGRESS 사용자 행들 */}
                {everyoneProgressUsers.map((user) => (
                  <div key={`everyone-user-row-${user.id}`} style={{ display: 'contents' }}>
                    {/* 사용자 이름 셀 */}
                    <div
                      className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"
                    >
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {user.name}
                      </span>
                    </div>

                    {/* 각 과제별 진행 상태 셀 */}
                    {assignments.map((assignment) => {
                      const status = getProgressStatus(user.id, assignment.id);
                      const submissionUrl = getSubmissionUrl(user.id, assignment.id);

                      return (
                        <div
                          key={`${user.id}-${assignment.id}`}
                          className="bg-white dark:bg-zinc-900 rounded-lg px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[60px]"
                        >
                          {status === "completed" ? (
                            submissionUrl ? (
                              <a
                                href={submissionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                                title={submissionUrl}
                              >
                                
                                <Check className="w-4 h-4 text-white" />
                              </a>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                                
                              </div>
                            )
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
