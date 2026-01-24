"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const supabase = createClient();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: "", // 숙제 제목
    content: "", // 숙제 내용
    startDate: "", // 게시 시작일
    startTime: "", // 게시 시작 시간
    endDate: "", // 게시 종료일
    endTime: "", // 게시 종료 시간
  });

  // 로딩 및 저장 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기존 데이터 불러오기
  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();

        if (error) {
          console.error("숙제 로드 오류:", error);
          alert("숙제 정보를 불러오는데 실패했습니다.");
          router.push("/");
          return;
        }

        if (!data) {
          alert("존재하지 않는 숙제입니다.");
          router.push("/");
          return;
        }

        // 현재 로그인한 사용자가 작성자인지 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== data.created_by) {
          alert("수정 권한이 없습니다.");
          router.push("/");
          return;
        }

        // 날짜와 시간을 분리하여 폼에 설정
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);

        setFormData({
          title: data.title || "",
          content: data.content || "",
          startDate: startDate.toISOString().split("T")[0],
          startTime: startDate.toTimeString().slice(0, 5), // HH:MM 형식
          endDate: endDate.toISOString().split("T")[0],
          endTime: endDate.toTimeString().slice(0, 5), // HH:MM 형식
        });
      } catch (error) {
        console.error("예상치 못한 오류:", error);
        alert("예상치 못한 오류가 발생했습니다.");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    if (assignmentId) {
      loadAssignment();
    }
  }, [assignmentId, router, supabase]);

  // 폼 필드 변경 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.title.trim()) {
      alert("숙제 제목을 입력해주세요.");
      return;
    }

    if (!formData.startDate || !formData.startTime) {
      alert("게시 시작일과 시간을 입력해주세요.");
      return;
    }

    if (!formData.endDate || !formData.endTime) {
      alert("게시 종료일과 시간을 입력해주세요.");
      return;
    }

    // 날짜와 시간을 결합하여 Date 객체 생성
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    // 종료일이 시작일보다 이전인지 확인
    if (endDateTime <= startDateTime) {
      alert("게시 종료일은 게시 시작일보다 이후여야 합니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert("로그인이 필요합니다.");
        setIsSubmitting(false);
        router.push("/");
        return;
      }

      // 데이터베이스 업데이트
      const { data, error } = await supabase
        .from("assignments")
        .update({
          title: formData.title.trim(),
          content: formData.content.trim() || null,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
        })
        .eq("id", assignmentId)
        .eq("created_by", user.id) // 작성자만 수정 가능하도록
        .select()
        .single();

      if (error) {
        console.error("수정 오류:", error);
        alert(`숙제 수정에 실패했습니다: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      // 성공 메시지 표시 후 리스트 페이지로 이동
      alert("숙제가 수정되었습니다!");
      router.push("/");
    } catch (error) {
      console.error("예상치 못한 오류:", error);
      alert("예상치 못한 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  // 취소 버튼 핸들러
  const handleCancel = () => {
    if (confirm("작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?")) {
      router.push("/");
    }
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full max-w-4xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            숙제 수정
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            숙제 정보를 수정하세요.
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 숙제 제목 */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-sm font-semibold text-black dark:text-zinc-50"
            >
              숙제 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="숙제 제목을 입력하세요"
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {/* 숙제 내용 */}
          <div className="space-y-2">
            <label
              htmlFor="content"
              className="text-sm font-semibold text-black dark:text-zinc-50"
            >
              숙제 내용
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="숙제 내용을 입력하세요"
              rows={6}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* 게시 시작일과 시간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="startDate"
                className="text-sm font-semibold text-black dark:text-zinc-50"
              >
                게시 시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="startTime"
                className="text-sm font-semibold text-black dark:text-zinc-50"
              >
                게시 시작 시간 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>

          {/* 게시 종료일과 시간 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="endDate"
                className="text-sm font-semibold text-black dark:text-zinc-50"
              >
                게시 종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="endTime"
                className="text-sm font-semibold text-black dark:text-zinc-50"
              >
                게시 종료 시간 <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
              />
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="px-6"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-6"
            >
              {isSubmitting ? "수정 중..." : "수정하기"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
