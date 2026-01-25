"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function NewAssignmentPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: "", // 숙제 제목
    content: "", // 숙제 내용
    startDate: "", // 게시 시작일
    startTime: "", // 게시 시작 시간
    endDate: "", // 게시 종료일
    endTime: "", // 게시 종료 시간
    lectureMaterialUrl: "", // 오늘의 강의자료 URL
    previousAnswerUrl: "", // 지난과제 모범답안 URL
  });

  // 저장 중 상태 관리
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // URL 유효성 검사 (입력된 경우에만)
      if (formData.lectureMaterialUrl.trim()) {
        try {
          new URL(formData.lectureMaterialUrl.trim());
        } catch {
          alert("오늘의 강의자료 URL 형식이 올바르지 않습니다.");
          setIsSubmitting(false);
          return;
        }
      }

      if (formData.previousAnswerUrl.trim()) {
        try {
          new URL(formData.previousAnswerUrl.trim());
        } catch {
          alert("지난과제 모범답안 URL 형식이 올바르지 않습니다.");
          setIsSubmitting(false);
          return;
        }
      }

      // 데이터베이스에 저장
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim() || null, // 빈 문자열이면 null로 저장
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          created_by: user.id,
          lecture_material_url: formData.lectureMaterialUrl.trim() || null, // 오늘의 강의자료 URL
          previous_answer_url: formData.previousAnswerUrl.trim() || null, // 지난과제 모범답안 URL
        })
        .select()
        .single();

      if (error) {
        console.error("저장 오류:", error);
        alert(`숙제 등록에 실패했습니다: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      // 성공 메시지 표시 후 리스트 페이지로 이동
      alert("숙제가 등록되었습니다!");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            숙제 작성
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            새로운 숙제를 등록하세요.
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

          {/* 오늘의 강의자료 URL */}
          <div className="space-y-2">
            <label
              htmlFor="lectureMaterialUrl"
              className="text-sm font-semibold text-black dark:text-zinc-50"
            >
              오늘의 강의자료 URL
            </label>
            <input
              type="url"
              id="lectureMaterialUrl"
              name="lectureMaterialUrl"
              value={formData.lectureMaterialUrl}
              onChange={handleChange}
              placeholder="https://example.com/lecture-material"
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              강의자료가 있는 URL을 입력하세요 (선택사항)
            </p>
          </div>

          {/* 지난과제 모범답안 URL */}
          <div className="space-y-2">
            <label
              htmlFor="previousAnswerUrl"
              className="text-sm font-semibold text-black dark:text-zinc-50"
            >
              지난과제 모범답안 URL
            </label>
            <input
              type="url"
              id="previousAnswerUrl"
              name="previousAnswerUrl"
              value={formData.previousAnswerUrl}
              onChange={handleChange}
              placeholder="https://example.com/previous-answer"
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              지난과제 모범답안이 있는 URL을 입력하세요 (선택사항)
            </p>
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
              {isSubmitting ? "등록 중..." : "등록하기"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
