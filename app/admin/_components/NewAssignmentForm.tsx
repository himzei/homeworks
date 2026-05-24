"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GROUP_OPTIONS } from "@/lib/constants";
import type { GroupOption } from "@/lib/fetch-group-options";
import {
  filterTime24Input,
  normalizeTime24,
} from "@/lib/time-24h";

type NewAssignmentFormProps = {
  /** URL group 쿼리로 전달된 기본 대상 과정 */
  initialGroupName?: string;
  /** 서버에서 조회한 과정 옵션 */
  groupOptions?: GroupOption[];
};

export default function NewAssignmentForm({
  initialGroupName = "",
  groupOptions,
}: NewAssignmentFormProps) {
  const resolvedGroupOptions = groupOptions ?? GROUP_OPTIONS;
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 취소·등록 완료 후 돌아갈 목록 경로 (group 필터 유지)
  const assignmentsListPath = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString
      ? `/admin/assignments?${queryString}`
      : "/admin/assignments";
  }, [searchParams]);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    groupName: initialGroupName,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    lectureMaterialUrl: "",
    previousAnswerUrl: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: filterTime24Input(value),
    }));
  };

  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalized = normalizeTime24(value);
    if (normalized) {
      setFormData((prev) => ({ ...prev, [name]: normalized }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const normalizedStartTime = normalizeTime24(formData.startTime);
    const normalizedEndTime = normalizeTime24(formData.endTime);

    if (!normalizedStartTime) {
      alert(
        "게시 시작 시간을 24시간 형식(HH:mm)으로 입력해주세요. 예: 09:00, 22:00",
      );
      return;
    }

    if (!normalizedEndTime) {
      alert(
        "게시 종료 시간을 24시간 형식(HH:mm)으로 입력해주세요. 예: 09:00, 22:00",
      );
      return;
    }

    const startDateTimeString = `${formData.startDate}T${normalizedStartTime}:00`;
    const endDateTimeString = `${formData.endDate}T${normalizedEndTime}:00`;

    const startDateTime = new Date(startDateTimeString);
    const endDateTime = new Date(endDateTimeString);

    if (isNaN(startDateTime.getTime())) {
      alert("게시 시작일과 시간이 올바르지 않습니다.");
      return;
    }

    if (isNaN(endDateTime.getTime())) {
      alert("게시 종료일과 시간이 올바르지 않습니다.");
      return;
    }

    if (endDateTime <= startDateTime) {
      alert("게시 종료일은 게시 시작일보다 이후여야 합니다.");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        alert(
          "권한 확인 중 오류가 발생했습니다. 관리자만 숙제를 등록할 수 있습니다.",
        );
        setIsSubmitting(false);
        return;
      }

      if (profile?.role !== "admin") {
        alert("관리자만 숙제를 등록할 수 있습니다.");
        setIsSubmitting(false);
        router.push("/home");
        return;
      }

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

      const { data, error } = await supabase
        .from("assignments")
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim() || null,
          group_name: formData.groupName.trim() || null,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          created_by: user.id,
          lecture_material_url: formData.lectureMaterialUrl.trim() || null,
          previous_answer_url: formData.previousAnswerUrl.trim() || null,
        })
        .select()
        .single();

      if (error) {
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

      alert("숙제가 등록되었습니다!");
      setIsSubmitting(false);
      router.push(assignmentsListPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status?: number }).status
          : undefined;

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

  const handleCancel = () => {
    if (confirm("작성 중인 내용이 사라집니다. 정말 취소하시겠습니까?")) {
      router.push(assignmentsListPath);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          {resolvedGroupOptions.map((opt) => (
            <option key={opt.value || "empty"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          빈 값 선택 시 전체 과정 공통 숙제로 등록됩니다.
        </p>
      </div>

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
          className="w-full min-h-[400px] sm:min-h-[600px] px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
        />
      </div>

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
            type="text"
            inputMode="numeric"
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            placeholder="22:00"
            maxLength={5}
            autoComplete="off"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            required
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            24시간 형식 (예: 09:00, 22:00 — 오후 10시는 22:00)
          </p>
        </div>
      </div>

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
            type="text"
            inputMode="numeric"
            id="endTime"
            name="endTime"
            value={formData.endTime}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            placeholder="22:00"
            maxLength={5}
            autoComplete="off"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            required
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            24시간 형식 (예: 09:00, 22:00 — 오후 10시는 22:00)
          </p>
        </div>
      </div>

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
  );
}
