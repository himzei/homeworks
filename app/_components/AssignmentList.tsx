"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";

// 숙제 데이터 타입 정의
interface Assignment {
  id: string;
  title: string; // 숙제 제목
  content?: string; // 숙제 내용 (선택적)
  startDate: Date; // 게시 시작일
  endDate: Date; // 게시 종료일
  submissionCount: number; // 제출한 학생 수
}

interface AssignmentListProps {
  assignments: Assignment[];
}

export default function AssignmentList({ assignments }: AssignmentListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 날짜와 시간을 포맷팅하는 함수
  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

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

      // 성공 시 페이지 새로고침
      alert("삭제되었습니다.");
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
          // 숙제 목록 렌더링
          assignments.map((assignment, index) => (
            <div
              key={assignment.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              {/* 번호 */}
              <div className="col-span-1 flex items-center">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {index + 1}
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
          ))
        )}
      </div>
    </div>
  );
}
