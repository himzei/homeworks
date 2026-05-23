"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/app/_components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { GROUP_OPTIONS } from "@/lib/constants";
import {
  filterTime24Input,
  formatTime24FromDate,
  normalizeTime24,
} from "@/lib/time-24h";
import { getSafeAdminAssignmentsReturnPath } from "@/lib/admin/admin-assignments-path";
import {
  getCachedAssignment,
  setCachedAssignment,
  invalidateAssignmentCache,
} from "@/lib/cache/assignment-cache";

/** useParams가 클라이언트 네비게이션 직후 undefined를 반환할 수 있어, URL에서 id를 보조로 추출 */
function useAssignmentId(): string | null {
  const params = useParams();
  return useMemo(() => {
    const fromParams = params?.id;
    if (typeof fromParams === "string" && fromParams) return fromParams;
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/\/assignment\/edit\/([^/]+)/);
      return match?.[1] ?? null;
    }
    return null;
  }, [params?.id]);
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = useAssignmentId();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // 관리자 목록에서 진입 시 returnTo로 돌아감, 없으면 과제 홈
  const returnPath = useMemo(() => {
    const safePath = getSafeAdminAssignmentsReturnPath(
      searchParams.get("returnTo"),
    );
    return safePath ?? "/home";
  }, [searchParams]);

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

  // 로딩 및 저장 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기존 데이터 불러오기 (캐시 우선 → 없으면 Supabase 조회)
  useEffect(() => {
    if (!assignmentId) {
      setIsLoading(false);
      router.replace("/home");
      return;
    }

    // 1) 캐시 확인 — 있으면 즉시 표시 (탭 전환 후 재진입 시 로딩 회피)
    const cached = getCachedAssignment(assignmentId);
    if (cached) {
      const startDate = new Date(cached.start_date);
      const endDate = new Date(cached.end_date);
      setFormData({
        title: cached.title || "",
        content: cached.content || "",
        groupName: cached.group_name || "",
        startDate: startDate.toISOString().split("T")[0],
        startTime: formatTime24FromDate(startDate),
        endDate: endDate.toISOString().split("T")[0],
        endTime: formatTime24FromDate(endDate),
        lectureMaterialUrl: cached.lecture_material_url || "",
        previousAnswerUrl: cached.previous_answer_url || "",
      });
      setIsLoading(false);
      // 캐시가 있어도 백그라운드에서 최신 데이터로 갱신
      loadAssignmentInBackground();
      return;
    }

    loadAssignment();

    async function loadAssignment() {
      try {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();

        if (error) {
          alert("숙제 정보를 불러오는데 실패했습니다.");
          router.push("/");
          return;
        }

        if (!data) {
          alert("존재하지 않는 숙제입니다.");
          router.push("/");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== data.created_by) {
          alert("수정 권한이 없습니다.");
          router.push("/");
          return;
        }

        setCachedAssignment(data);
        applyDataToForm(data);
      } catch {
        alert("예상치 못한 오류가 발생했습니다.");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    }

    async function loadAssignmentInBackground() {
      try {
        const { data } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", assignmentId)
          .single();
        if (data) {
          setCachedAssignment(data);
          applyDataToForm(data);
        }
      } catch {
        // 백그라운드 갱신 실패는 무시
      }
    }

    function applyDataToForm(data: {
      title?: string | null;
      content?: string | null;
      group_name?: string | null;
      start_date: string;
      end_date: string;
      lecture_material_url?: string | null;
      previous_answer_url?: string | null;
    }) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      setFormData({
        title: data.title || "",
        content: data.content || "",
        groupName: data.group_name || "",
        startDate: startDate.toISOString().split("T")[0],
        startTime: formatTime24FromDate(startDate),
        endDate: endDate.toISOString().split("T")[0],
        endTime: formatTime24FromDate(endDate),
        lectureMaterialUrl: data.lecture_material_url || "",
        previousAnswerUrl: data.previous_answer_url || "",
      });
    }
  }, [assignmentId, router]);

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

  // 24시간 형식 시간 입력 (HH:mm)
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

    // 날짜와 시간을 결합하여 Date 객체 생성
    const startDateTime = new Date(
      `${formData.startDate}T${normalizedStartTime}:00`,
    );
    const endDateTime = new Date(
      `${formData.endDate}T${normalizedEndTime}:00`,
    );

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      alert("게시 일시가 올바르지 않습니다.");
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

      // 업데이트할 데이터 준비
      const updateData = {
        title: formData.title.trim(),
        content: formData.content.trim() || null,
        group_name: formData.groupName.trim() || null,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        lecture_material_url: formData.lectureMaterialUrl.trim() || null,
        previous_answer_url: formData.previousAnswerUrl.trim() || null,
      };

      // 데이터베이스 업데이트
      const { data, error } = await supabase
        .from("assignments")
        .update(updateData)
        .eq("id", assignmentId)
        .eq("created_by", user.id) // 작성자만 수정 가능하도록
        .select()
        .single();

      if (error) {
        alert(`숙제 수정에 실패했습니다: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (!data) {
        alert("숙제 수정에 실패했습니다. 업데이트된 데이터를 확인할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }

      // 저장 성공 시 캐시 무효화 (다음 진입 시 최신 데이터 로드)
      if (assignmentId) invalidateAssignmentCache(assignmentId);

      alert("숙제가 수정되었습니다!");
      setIsSubmitting(false);
      router.push(returnPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
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
      router.push(returnPath);
    }
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-full w-full container flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">로딩 중...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-full w-full container flex-col py-8 px-4 sm:px-8 bg-white dark:bg-black">
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
              className="w-full min-h-[600px] px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-y"
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
              {isSubmitting ? "수정 중..." : "수정하기"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
