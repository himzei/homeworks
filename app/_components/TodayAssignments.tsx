"use client";

import HomeworkSubmission from "./HomeworkSubmission";

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

interface TodayAssignmentsProps {
  assignments: TodayAssignment[];
}

export default function TodayAssignments({ assignments }: TodayAssignmentsProps) {
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
          현재 진행 중인 숙제가 없습니다.
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
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
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
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
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
        </div>
      ))}
    </div>
  );
}
