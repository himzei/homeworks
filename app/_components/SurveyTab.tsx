"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAdmin } from "@/lib/auth/SessionProvider";
import { Button } from "@/app/_components/ui/button";

// 설문조사 타입 정의
interface Survey {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string;
  is_active: boolean; // 현재 진행 중인 설문조사인지
  response_count?: number; // 응답 수 (관리자용)
  has_responded?: boolean; // 현재 사용자가 응답했는지
}

// 질문 타입 정의
type QuestionType = "multiple_choice" | "single_choice" | "text";

interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[]; // 다중선택/하나선택용 옵션 목록
  orderIndex: number;
}

export default function SurveyTab() {
  const supabase = createClient();

  // 관리자 권한 확인
  const { isAdmin, isCheckingAdmin } = useAdmin();

  // 설문조사 목록 상태
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 설문조사 작성 폼 상태
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 설문조사 응답 모달 상태
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState<boolean>(false);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState<boolean>(false);

  // 현재 사용자 ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, [supabase]);

  // 설문조사 목록 가져오기
  useEffect(() => {
    if (isCheckingAdmin) return;

    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingAdmin, currentUserId]);

  const fetchSurveys = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 설문조사 목록 가져오기
      const { data: surveysData, error: surveysError } = await supabase
        .from("surveys")
        .select("*")
        .order("created_at", { ascending: false });

      if (surveysError) {
        console.error("설문조사 목록 조회 실패:", surveysError);
        setError("설문조사 목록을 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
        return;
      }

      const now = new Date();

      // 각 설문조사에 대한 추가 정보 가져오기
      const surveysWithInfo = await Promise.all(
        (surveysData || []).map(async (survey) => {
          const startDate = new Date(survey.start_date);
          const endDate = new Date(survey.end_date);
          const isActive = now >= startDate && now <= endDate;

          // 관리자인 경우 응답 수 가져오기
          let responseCount = 0;
          if (isAdmin && currentUserId) {
            // 설문조사에 질문이 있는지 확인
            const { data: questionsData } = await supabase
              .from("survey_questions")
              .select("id")
              .eq("survey_id", survey.id);

            if (questionsData && questionsData.length > 0) {
              // 질문별 응답 수 집계 (중복 제거)
              const { data: responsesData } = await supabase
                .from("survey_question_responses")
                .select("user_id")
                .in(
                  "question_id",
                  questionsData.map((q) => q.id),
                );

              if (responsesData) {
                const uniqueUsers = new Set(responsesData.map((r) => r.user_id));
                responseCount = uniqueUsers.size;
              }
            } else {
              // 기존 방식 (질문이 없는 경우)
              const { count } = await supabase
                .from("survey_responses")
                .select("*", { count: "exact", head: true })
                .eq("survey_id", survey.id);
              responseCount = count || 0;
            }
          }

          // 현재 사용자가 응답했는지 확인
          let hasResponded = false;
          if (currentUserId) {
            // 질문이 있는 경우
            const { data: questionsData } = await supabase
              .from("survey_questions")
              .select("id")
              .eq("survey_id", survey.id)
              .limit(1);

            if (questionsData && questionsData.length > 0) {
              const { data: responseData } = await supabase
                .from("survey_question_responses")
                .select("id")
                .eq("question_id", questionsData[0].id)
                .eq("user_id", currentUserId)
                .limit(1);
              hasResponded = !!responseData && responseData.length > 0;
            } else {
              // 기존 방식
              const { data: existingResponse } = await supabase
                .from("survey_responses")
                .select("id")
                .eq("survey_id", survey.id)
                .eq("user_id", currentUserId)
                .single();
              hasResponded = !!existingResponse;
            }
          }

          return {
            ...survey,
            is_active: isActive,
            response_count: responseCount,
            has_responded: hasResponded,
          };
        }),
      );

      setSurveys(surveysWithInfo);
    } catch (error) {
      console.error("설문조사 목록 가져오기 중 오류:", error);
      setError("설문조사 목록을 불러오는 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 설문조사 작성 폼 초기화
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate(new Date().toISOString().slice(0, 16));
    setEndDate("");
    setQuestions([]);
    setIsWriting(false);
    setError(null);
  };

  // 질문 추가
  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}-${Math.random()}`,
      questionText: "",
      questionType: type,
      options: type === "text" ? [] : [""], // 단답형은 옵션 없음, 선택형은 기본 옵션 1개
      orderIndex: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  // 질문 삭제
  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  // 질문 텍스트 업데이트
  const updateQuestionText = (questionId: string, text: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, questionText: text } : q,
      ),
    );
  };

  // 옵션 추가
  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, ""] }
          : q,
      ),
    );
  };

  // 옵션 삭제
  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((_, idx) => idx !== optionIndex),
            }
          : q,
      ),
    );
  };

  // 옵션 텍스트 업데이트
  const updateOptionText = (
    questionId: string,
    optionIndex: number,
    text: string,
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) =>
                idx === optionIndex ? text : opt,
              ),
            }
          : q,
      ),
    );
  };

  // 설문조사 작성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 관리자 권한 확인
    if (!isAdmin) {
      setError("관리자만 설문조사를 작성할 수 있습니다.");
      return;
    }

    // 유효성 검사
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!startDate || !endDate) {
      setError("시작일과 종료일을 모두 입력해주세요.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setError("종료일은 시작일보다 이후여야 합니다.");
      return;
    }

    // 질문 유효성 검사
    if (questions.length === 0) {
      setError("최소 하나 이상의 질문을 추가해주세요.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`${i + 1}번째 질문의 내용을 입력해주세요.`);
        return;
      }

      if (q.questionType !== "text" && q.options.length === 0) {
        setError(`${i + 1}번째 질문에 최소 하나 이상의 선택지를 추가해주세요.`);
        return;
      }

      if (q.questionType !== "text") {
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].trim()) {
            setError(
              `${i + 1}번째 질문의 ${j + 1}번째 선택지 내용을 입력해주세요.`,
            );
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 설문조사 생성
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_date: startDate,
          end_date: endDate,
        })
        .select()
        .single();

      if (surveyError) {
        console.error("설문조사 작성 실패:", surveyError);
        setError(
          `설문조사 작성 중 오류가 발생했습니다: ${surveyError.message || "알 수 없는 오류"}`,
        );
        return;
      }

      if (!surveyData) {
        setError("설문조사 생성에 실패했습니다.");
        return;
      }

      // 질문 및 옵션 생성
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // 질문 생성
        const { data: questionData, error: questionError } = await supabase
          .from("survey_questions")
          .insert({
            survey_id: surveyData.id,
            question_text: q.questionText.trim(),
            question_type: q.questionType,
            order_index: i,
          })
          .select()
          .single();

        if (questionError) {
          console.error("질문 생성 실패:", questionError);
          setError(
            `질문 생성 중 오류가 발생했습니다: ${questionError.message || "알 수 없는 오류"}`,
          );
          return;
        }

        // 선택형 질문인 경우 옵션 생성
        if (q.questionType !== "text" && questionData) {
          const optionsToInsert = q.options
            .filter((opt) => opt.trim())
            .map((opt, idx) => ({
              question_id: questionData.id,
              option_text: opt.trim(),
              order_index: idx,
            }));

          if (optionsToInsert.length > 0) {
            const { error: optionsError } = await supabase
              .from("survey_question_options")
              .insert(optionsToInsert);

            if (optionsError) {
              console.error("옵션 생성 실패:", optionsError);
              setError(
                `옵션 생성 중 오류가 발생했습니다: ${optionsError.message || "알 수 없는 오류"}`,
              );
              return;
            }
          }
        }
      }

      // 성공 시 목록 새로고침 및 폼 초기화
      await fetchSurveys();
      resetForm();
    } catch (err) {
      console.error("설문조사 작성 중 오류:", err);
      setError("설문조사 작성 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 설문조사 삭제 (관리자만)
  const handleDelete = async (surveyId: string) => {
    if (!isAdmin) {
      setError("관리자만 설문조사를 삭제할 수 있습니다.");
      return;
    }

    if (!confirm("정말 이 설문조사를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId);

      if (deleteError) {
        console.error("설문조사 삭제 실패:", deleteError);
        setError(
          `설문조사 삭제 중 오류가 발생했습니다: ${deleteError.message || "알 수 없는 오류"}`,
        );
        return;
      }

      // 성공 시 목록 새로고침
      await fetchSurveys();
    } catch (err) {
      console.error("설문조사 삭제 중 오류:", err);
      setError("설문조사 삭제 중 예기치 않은 오류가 발생했습니다.");
    }
  };

  // 에러가 발생한 경우 에러 메시지 표시
  if (error && !isLoading && !isWriting) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <p className="text-yellow-700 dark:text-yellow-300 font-medium">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-2">
          설문조사
        </h2>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {isAdmin
            ? "설문조사를 작성하고 관리할 수 있습니다."
            : "진행 중인 설문조사에 응답할 수 있습니다."}
        </p>
      </div>

      {/* 관리자 권한 확인 중 */}
      {isCheckingAdmin && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          권한 확인 중...
        </div>
      )}

      {/* 설문조사 작성 폼 (관리자만) */}
      {!isCheckingAdmin && isAdmin && !isWriting && (
        <div className="mb-6">
          <Button
            onClick={() => setIsWriting(true)}
            variant="default"
            className="w-full sm:w-auto"
          >
            설문조사 작성하기
          </Button>
        </div>
      )}

      {/* 설문조사 작성 폼 */}
      {!isCheckingAdmin && isAdmin && isWriting && (
        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50 mb-4">
            새 설문조사 작성
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 제목 */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="설문조사 제목을 입력하세요"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 설명 */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                설명 (선택사항)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="설문조사 설명을 입력하세요"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* 시작일 */}
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 종료일 */}
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 질문 추가 버튼 */}
            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                질문 추가
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => addQuestion("multiple_choice")}
                  variant="outline"
                  size="sm"
                >
                  + 다중선택항목
                </Button>
                <Button
                  type="button"
                  onClick={() => addQuestion("single_choice")}
                  variant="outline"
                  size="sm"
                >
                  + 하나선택항목
                </Button>
                <Button
                  type="button"
                  onClick={() => addQuestion("text")}
                  variant="outline"
                  size="sm"
                >
                  + 단답형 항목
                </Button>
              </div>
            </div>

            {/* 질문 목록 */}
            {questions.length > 0 && (
              <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                {questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        질문 {qIndex + 1} (
                        {question.questionType === "multiple_choice"
                          ? "다중선택"
                          : question.questionType === "single_choice"
                            ? "하나선택"
                            : "단답형"}
                        )
                      </span>
                      <Button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        variant="destructive"
                        size="sm"
                      >
                        삭제
                      </Button>
                    </div>

                    {/* 질문 내용 입력 */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={question.questionText}
                        onChange={(e) =>
                          updateQuestionText(question.id, e.target.value)
                        }
                        placeholder="질문 내용을 입력하세요"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* 선택형 질문인 경우 옵션 입력 */}
                    {question.questionType !== "text" && (
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                updateOptionText(
                                  question.id,
                                  optIndex,
                                  e.target.value,
                                )
                              }
                              placeholder={`선택지 ${optIndex + 1}을 입력하세요`}
                              className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {question.options.length > 1 && (
                              <Button
                                type="button"
                                onClick={() =>
                                  removeOption(question.id, optIndex)
                                }
                                variant="outline"
                                size="sm"
                              >
                                삭제
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          onClick={() => addOption(question.id)}
                          variant="outline"
                          size="sm"
                        >
                          + 선택지 추가
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button type="submit" disabled={isSubmitting} variant="default">
                {isSubmitting ? "저장 중..." : "저장하기"}
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                variant="outline"
                disabled={isSubmitting}
              >
                취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 설문조사 목록 */}
      {isLoading ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          불러오는 중...
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            등록된 설문조사가 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-black dark:text-zinc-50">
                      {survey.title}
                    </h3>
                    {survey.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        진행중
                      </span>
                    )}
                    {survey.has_responded && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        응답완료
                      </span>
                    )}
                  </div>

                  {survey.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                      {survey.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>
                      시작일:{" "}
                      {new Date(survey.start_date).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      종료일:{" "}
                      {new Date(survey.end_date).toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isAdmin && survey.response_count !== undefined && (
                      <span>응답 수: {survey.response_count}개</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {/* 응답 버튼 (진행 중이고 아직 응답하지 않은 경우) */}
                  {survey.is_active &&
                    !survey.has_responded &&
                    !isAdmin && (
                      <Button
                        onClick={() => {
                          setSelectedSurvey(survey);
                          setIsResponseModalOpen(true);
                        }}
                        variant="default"
                        size="sm"
                      >
                        응답하기
                      </Button>
                    )}

                  {/* 삭제 버튼 (관리자만) */}
                  {isAdmin && (
                    <Button
                      onClick={() => handleDelete(survey.id)}
                      variant="destructive"
                      size="sm"
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 설문조사 응답 모달 - 추후 구현 */}
      {isResponseModalOpen && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {selectedSurvey.title}
              </h2>
              <button
                onClick={() => {
                  setIsResponseModalOpen(false);
                  setSelectedSurvey(null);
                }}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-2xl font-light"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-zinc-500 dark:text-zinc-400">
                설문조사 응답 기능은 추후 구현 예정입니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
