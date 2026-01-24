"use client";

import HomeworkSubmission from "./HomeworkSubmission";

// 오늘의 숙제 데이터 타입 정의
interface TodayAssignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
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

  return (
    <div className="w-full space-y-4">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-6"
        >
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
