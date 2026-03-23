"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GROUP_OPTIONS } from "@/lib/constants";

export default function NewAssignmentPage() {
  const router = useRouter();
  const supabase = createClient();

  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: "", // 숙제 제목
    content: "", // 숙제 내용
    groupName: "", // 대상 과정 (빈 값: 전체 공통)
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
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

    // 날짜와 시간을 결합하여 Date 객체 생성 (로컬 타임존 사용)
    // ISO 형식으로 변환: YYYY-MM-DDTHH:mm 형식
    const startDateTimeString = `${formData.startDate}T${formData.startTime}:00`;
    const endDateTimeString = `${formData.endDate}T${formData.endTime}:00`;
    
    // 로컬 시간을 UTC로 변환
    const startDateTime = new Date(startDateTimeString);
    const endDateTime = new Date(endDateTimeString);

    // 날짜 유효성 검사
    if (isNaN(startDateTime.getTime())) {
      alert("게시 시작일과 시간이 올바르지 않습니다.");
      return;
    }

    if (isNaN(endDateTime.getTime())) {
      alert("게시 종료일과 시간이 올바르지 않습니다.");
      return;
    }

    // 종료일이 시작일보다 이전인지 확인
    if (endDateTime <= startDateTime) {
      alert("게시 종료일은 게시 시작일보다 이후여야 합니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        // refresh token 에러 체크
        if (
          userError.message?.includes("Refresh Token") ||
          userError.message?.includes("refresh_token") ||
          userError.status === 401
        ) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          await supabase.auth.signOut();
          router.push("/");
        } else {
          alert(`로그인 확인 중 오류가 발생했습니다: ${userError.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      if (!user) {
        alert("로그인이 필요합니다.");
        setIsSubmitting(false);
        router.push("/");
        return;
      }

      // 관리자 권한 확인
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        alert("권한 확인 중 오류가 발생했습니다. 관리자만 숙제를 등록할 수 있습니다.");
        setIsSubmitting(false);
        return;
      }

      if (profile?.role !== "admin") {
        alert("관리자만 숙제를 등록할 수 있습니다.");
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
          group_name: formData.groupName.trim() || null, // null: 전체 공통, 값: 해당 과정 전용
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          created_by: user.id,
          lecture_material_url: formData.lectureMaterialUrl.trim() || null, // 오늘의 강의자료 URL
          previous_answer_url: formData.previousAnswerUrl.trim() || null, // 지난과제 모범답안 URL
        })
        .select()
        .single();

      if (error) {
        // 더 구체적인 에러 메시지 제공
        let errorMessage = "숙제 등록에 실패했습니다.";
        if (error.code === "42501") {
          errorMessage = "권한이 없습니다. 관리자만 숙제를 등록할 수 있습니다.";
        } else if (error.code === "23505") {
          errorMessage = "이미 존재하는 숙제입니다.";
        } else if (error.message) {
          errorMessage = `숙제 등록에 실패했습니다: ${error.message}`;
        }
        
        alert(errorMessage);
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        alert("숙제 등록에 실패했습니다. 저장된 데이터를 확인할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }

      // 성공 메시지 표시 후 리스트 페이지로 이동
      alert("숙제가 등록되었습니다!");
      setIsSubmitting(false);
      router.push("/home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      // refresh token 에러 체크
      if (
        message.includes("Refresh Token") ||
        message.includes("refresh_token") ||
        status === 401
      ) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        await supabase.auth.signOut();
        router.push("/");
      } else {
        alert(`예상치 못한 오류가 발생했습니다: ${message}`);
      }
      setIsSubmitting(false);
    }
  };

  // 취소 버튼 핸들러
  const handleCancel = () => {
    if (confirm("작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?")) {
      router.push("/home");
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

          {/* 대상 과정 */}
          <div className="space-y-2">
            <label
              htmlFor="groupName"
              className="text-sm font-semibold text-black dark:text-zinc-50"
            >
              대상 과정
            </label>
            <select
              id="groupName"
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value || "empty"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              빈 값 선택 시 전체 과정 공통 숙제로 등록됩니다.
            </p>
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
