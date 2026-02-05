"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HomeworkSubmissionProps {
  assignmentId: string; // 어떤 숙제에 대한 제출인지 식별
}

export default function HomeworkSubmission({
  assignmentId,
}: HomeworkSubmissionProps) {
  const supabase = createClient();
  const router = useRouter();

  // URL 입력 상태 관리
  const [url, setUrl] = useState<string>("");
  // 저장 성공/실패 상태 관리
  const [isSaved, setIsSaved] = useState<boolean>(false);
  // 저장 중 상태 관리
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // 기존 제출 정보 로드 상태
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 과제 제목 저장
  const [assignmentTitle, setAssignmentTitle] = useState<string>("");

  // 기존 제출 정보 및 과제 정보 불러오기
  useEffect(() => {
    const loadExistingSubmission = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // 과제 정보 가져오기 (제목 조회)
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignments")
          .select("title")
          .eq("id", assignmentId)
          .single();

        if (assignmentData && !assignmentError) {
          setAssignmentTitle(assignmentData.title);
        }

        // 기존 제출 정보 확인
        const { data, error } = await supabase
          .from("homeworks")
          .select("url")
          .eq("user_id", user.id)
          .eq("assignment_id", assignmentId)
          .single();

        if (data && !error) {
          setUrl(data.url);
        }
      } catch (error) {
        // 데이터가 없을 때는 에러가 발생할 수 있음 (정상)
        console.log("기존 제출 정보 없음");
      } finally {
        setIsLoading(false);
      }
    };

    if (assignmentId) {
      loadExistingSubmission();
    }
  }, [assignmentId, supabase]);

  // 저장 버튼 클릭 핸들러
  const handleSave = async () => {
    // URL 유효성 검사
    if (!url.trim()) {
      alert("URL을 입력해주세요.");
      return;
    }

    // URL 형식 검사
    try {
      new URL(url);
    } catch {
      alert("올바른 URL 형식이 아닙니다.");
      return;
    }

    // 로그인 확인
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsSaving(true);

    try {
      // 기존 제출이 있는지 확인
      const { data: existing } = await supabase
        .from("homeworks")
        .select("id")
        .eq("user_id", user.id)
        .eq("assignment_id", assignmentId)
        .single();

      const isNewSubmission = !existing; // 새 제출인지 수정인지 확인

      if (existing) {
        // 기존 제출이 있으면 업데이트
        const { error } = await supabase
          .from("homeworks")
          .update({ url: url.trim() })
          .eq("id", existing.id);

        if (error) {
          console.error("업데이트 오류:", error);
          alert(`제출 수정에 실패했습니다: ${error.message}`);
          setIsSaving(false);
          return;
        }
      } else {
        // 새로 제출
        const { error } = await supabase.from("homeworks").insert({
          user_id: user.id,
          assignment_id: assignmentId,
          url: url.trim(),
          homework_number: 0, // 기존 컬럼 호환성을 위해 (나중에 제거 가능)
        });

        if (error) {
          console.error("저장 오류:", error);
          alert(`제출에 실패했습니다: ${error.message}`);
          setIsSaving(false);
          return;
        }
      }

      // 과제 제출 완료 확인 이메일 전송 (새 제출인 경우에만)
      if (isNewSubmission && user.email) {
        try {
          const emailResponse = await fetch("/api/send-submission-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              assignmentId: assignmentId,
              userEmail: user.email,
              assignmentTitle: assignmentTitle,
              submissionUrl: url.trim(),
            }),
          });

          const emailResult = await emailResponse.json();

          if (!emailResponse.ok) {
            console.error("이메일 전송 실패:", emailResult.error);
            // 이메일 전송 실패해도 제출은 성공했으므로 계속 진행
          } else {
            console.log("이메일 전송 성공:", emailResult.message);
          }
        } catch (emailError) {
          console.error("이메일 전송 중 오류 발생:", emailError);
          // 이메일 전송 실패해도 제출은 성공했으므로 계속 진행
        }
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      // 페이지 새로고침하여 제출 상태 반영
      router.refresh();
    } catch (error) {
      console.error("예상치 못한 오류:", error);
      alert("예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 mt-6 sm:mt-8">
        <p className="text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          로딩 중...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 mt-6 sm:mt-8">
      {/* 제목 */}
      <h3 className="text-lg sm:text-xl font-semibold text-black dark:text-zinc-50 text-center mb-3 sm:mb-4">
        과제 제출하기
      </h3>

      {/* 안내 텍스트 */}
      <div className="space-y-2 mb-4 sm:mb-6 text-center">
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          제출 방법에 맞는 URL을 여기에 붙여 넣으세요.
        </p>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          제출 기한 내에 언제든 해당 URL을 수정할 수 있습니다.
        </p>
      </div>

      {/* URL 입력 필드와 저장 버튼 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your awesome URL here!"
          className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          onKeyDown={(e) => {
            // Enter 키로 저장 가능
            if (e.key === "Enter") {
              handleSave();
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm sm:text-base font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          {isSaving ? "저장 중..." : url ? "수정" : "제출"}
        </button>
      </div>

      {/* 저장 성공 메시지 */}
      {isSaved && (
        <div className="mt-4 text-center text-sm text-green-600 dark:text-green-400">
          {url ? "수정되었습니다!" : "제출되었습니다!"}
        </div>
      )}
    </div>
  );
}
