"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, MessageSquare } from "lucide-react";

import {
  TEAM_ATTACHMENT_ACCEPT,
  TEAM_ATTACHMENT_HINT,
  type TeamMemberEvaluation,
  type TeamProjectFeedbackComment,
  type TeamProjectInfo,
} from "@/lib/class-role-team-projects";
import { Button } from "@/app/_components/ui/button";

const feedbackDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  snapshotId: string;
  teamNumber: number;
  teamLabel: string;
  initialProject: TeamProjectInfo | null;
  teamMembers: Array<{ id: string; name: string; isLeader: boolean }>;
  backHref: string;
};

/**
 * 조별 프로젝트 편집 - 페이지 버전
 * - 기존 TeamProjectEditDialog의 기능을 그대로 제공하되, 모달 UI(오버레이)는 제거한다.
 */
export default function TeamProjectEditPageClient({
  snapshotId,
  teamNumber,
  teamLabel,
  initialProject,
  teamMembers,
  backHref,
}: Props) {
  const [topic, setTopic] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [feedbackComments, setFeedbackComments] = useState<
    TeamProjectFeedbackComment[]
  >([]);
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [processingCommentId, setProcessingCommentId] = useState<string | null>(
    null,
  );
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [existingPptFileName, setExistingPptFileName] = useState<string | null>(
    null,
  );
  const [removeExistingPpt, setRemoveExistingPpt] = useState(false);
  // 한글 주석: 섹션별 저장 상태
  const [isSavingAttachment, setIsSavingAttachment] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isSavingEvaluations, setIsSavingEvaluations] = useState(false);
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [evaluationsByProfileId, setEvaluationsByProfileId] = useState<
    Record<string, TeamMemberEvaluation>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 한글 주석: 서버에서 넘어온 초기 데이터를 폼에 주입
    setTopic(initialProject?.topic ?? "");
    setGithubUrl(initialProject?.githubUrl ?? "");
    setFeedbackComments(initialProject?.feedbackComments ?? []);
    setEvaluationsByProfileId(initialProject?.evaluations ?? {});
    setNewFeedbackText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setProcessingCommentId(null);
    setPptFile(null);
    setExistingPptFileName(initialProject?.pptFileName ?? null);
    setRemoveExistingPpt(false);
    setErrorMessage(null);
  }, [initialProject, teamNumber]);

  const applyProjectUpdate = (project: TeamProjectInfo) => {
    // 한글 주석: 서버 응답을 화면 상태에 반영(부분 저장 포함)
    setTopic(project.topic ?? "");
    setGithubUrl(project.githubUrl ?? "");
    setFeedbackComments(project.feedbackComments);
    setExistingPptFileName(project.pptFileName ?? null);
    setRemoveExistingPpt(false);
    setPptFile(null);
    setEvaluationsByProfileId(project.evaluations ?? {});
  };

  const getEvaluationOrDefault = (profileId: string): TeamMemberEvaluation => {
    return (
      evaluationsByProfileId[profileId] ?? {
        topic: 0,
        responsibility: 0,
        dataAnalysis: 0,
        resultQuality: 0,
        explanation: 0,
        workAssignment: "",
        feedback: "",
      }
    );
  };

  const updateEvaluation = (
    profileId: string,
    patch: Partial<TeamMemberEvaluation>,
  ) => {
    setEvaluationsByProfileId((prev) => ({
      ...prev,
      [profileId]: {
        ...getEvaluationOrDefault(profileId),
        ...patch,
      },
    }));
  };

  const clampScore = (raw: string): number => {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(20, Math.max(0, parsed));
  };

  const computeTotal = (e: TeamMemberEvaluation): number => {
    return (
      e.topic +
      e.responsibility +
      e.dataAnalysis +
      e.resultQuality +
      e.explanation
    );
  };

  const computeGrade = (total: number): string => {
    // 한글 주석: 간단한 등급 표시(필요 없으면 UI에서 제거 가능)
    if (total >= 90) return "A";
    if (total >= 80) return "B";
    if (total >= 70) return "C";
    if (total >= 60) return "D";
    return "F";
  };

  const handleDownloadExisting = async () => {
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/team-project?teamNumber=${teamNumber}`,
      );
      const payload = (await response.json()) as {
        signedUrl?: string;
        fileName?: string;
        error?: string;
      };
      if (!response.ok || !payload.signedUrl) {
        setErrorMessage(payload.error ?? "파일을 불러오지 못했습니다.");
        return;
      }
      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      setErrorMessage("파일 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddFeedback = async () => {
    const content = newFeedbackText.trim();
    if (!content) {
      setErrorMessage("피드백 내용을 입력해 주세요.");
      return;
    }

    setIsPostingFeedback(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/team-project/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamNumber, content }),
        },
      );
      const payload = (await response.json()) as {
        project?: TeamProjectInfo;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        setErrorMessage(payload.error ?? "피드백 등록에 실패했습니다.");
        return;
      }

      applyProjectUpdate(payload.project);
      setNewFeedbackText("");

      requestAnimationFrame(() => {
        feedbackListRef.current?.scrollTo({
          top: feedbackListRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch {
      setErrorMessage("피드백 등록 중 오류가 발생했습니다.");
    } finally {
      setIsPostingFeedback(false);
    }
  };

  const handleStartEditComment = (comment: TeamProjectFeedbackComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
    setErrorMessage(null);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditComment = async (commentId: string) => {
    const content = editingCommentText.trim();
    if (!content) {
      setErrorMessage("피드백 내용을 입력해 주세요.");
      return;
    }

    setProcessingCommentId(commentId);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/team-project/feedback`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamNumber, commentId, content }),
        },
      );
      const payload = (await response.json()) as {
        project?: TeamProjectInfo;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        setErrorMessage(payload.error ?? "수정에 실패했습니다.");
        return;
      }

      applyProjectUpdate(payload.project);
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch {
      setErrorMessage("수정 중 오류가 발생했습니다.");
    } finally {
      setProcessingCommentId(null);
    }
  };

  const handleDeleteComment = async (comment: TeamProjectFeedbackComment) => {
    if (
      !window.confirm(
        `이 피드백을 삭제할까요?\n\n"${comment.content.slice(0, 40)}${comment.content.length > 40 ? "…" : ""}"`,
      )
    ) {
      return;
    }

    setProcessingCommentId(comment.id);
    setErrorMessage(null);

    try {
      const deleteParams = new URLSearchParams({
        teamNumber: String(teamNumber),
        commentId: comment.id,
      });
      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/team-project/feedback?${deleteParams.toString()}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as {
        project?: TeamProjectInfo;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        setErrorMessage(payload.error ?? "삭제에 실패했습니다.");
        return;
      }

      applyProjectUpdate(payload.project);
      if (editingCommentId === comment.id) {
        handleCancelEditComment();
      }
    } catch {
      setErrorMessage("삭제 중 오류가 발생했습니다.");
    } finally {
      setProcessingCommentId(null);
    }
  };

  const saveProjectSection = async (input: {
    includeTopicGithub?: boolean;
    includeEvaluations?: boolean;
    includeAttachment?: boolean;
  }) => {
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("teamNumber", String(teamNumber));

      if (input.includeTopicGithub) {
        formData.set("topic", topic);
        formData.set("githubUrl", githubUrl);
      }

      if (input.includeEvaluations) {
        // 한글 주석: 평가표 입력값을 JSON으로 저장한다.
        formData.set("evaluationsJson", JSON.stringify(evaluationsByProfileId));
      }

      if (input.includeAttachment) {
        if (removeExistingPpt) {
          formData.set("removePpt", "true");
        }
        if (pptFile) {
          formData.set("pptFile", pptFile);
        }
      }

      const response = await fetch(
        `/api/admin/class-role-snapshots/${snapshotId}/team-project`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json()) as {
        project?: TeamProjectInfo;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        setErrorMessage(payload.error ?? "저장에 실패했습니다.");
        return;
      }

      applyProjectUpdate(payload.project);
      return true;
    } catch {
      setErrorMessage("저장 중 오류가 발생했습니다.");
      return false;
    }
  };

  const handleSaveAttachment = async () => {
    setIsSavingAttachment(true);
    try {
      await saveProjectSection({ includeAttachment: true });
    } finally {
      setIsSavingAttachment(false);
    }
  };

  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    try {
      await saveProjectSection({ includeTopicGithub: true });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSaveEvaluations = async () => {
    setIsSavingEvaluations(true);
    try {
      await saveProjectSection({ includeEvaluations: true });
    } finally {
      setIsSavingEvaluations(false);
    }
  };

  const showExistingPpt =
    !!existingPptFileName && !removeExistingPpt && !pptFile;

  const isBusy =
    isSavingAttachment ||
    isSavingMeta ||
    isSavingEvaluations ||
    isPostingFeedback ||
    processingCommentId !== null;

  return (
    <main className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <header className="px-4 sm:px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              {teamLabel} 프로젝트 정보
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              주제·GitHub·첨부는 저장 버튼으로, 피드백은 댓글처럼 추가합니다.
            </p>
          </div>
          <Link href={backHref}>
            <Button variant="outline">닫기</Button>
          </Link>
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 space-y-5">

        {/* 첨부파일 (요청: 평가표 아래로 배치) */}
        <section>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="team-project-ppt"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              첨부파일
            </label>
            <Button
              type="button"
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={
                isBusy ||
                (!pptFile && !removeExistingPpt) // 한글 주석: 업로드/삭제 변경 없으면 저장 불필요
              }
              onClick={() => void handleSaveAttachment()}
            >
              {isSavingAttachment ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                "첨부 저장"
              )}
            </Button>
          </div>

          {showExistingPpt ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2">
              <FileText className="size-4 shrink-0 text-zinc-500" />
              <span className="text-sm text-zinc-800 dark:text-zinc-200 truncate flex-1 min-w-0">
                {existingPptFileName}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy || isDownloading}
                onClick={() => void handleDownloadExisting()}
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="size-3.5" />
                )}
                열기
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => setRemoveExistingPpt(true)}
              >
                삭제
              </Button>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            id="team-project-ppt"
            type="file"
            accept={TEAM_ATTACHMENT_ACCEPT}
            disabled={isBusy}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setPptFile(file);
              if (file) setRemoveExistingPpt(false);
            }}
            className="mt-2 block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950/40 dark:file:text-blue-300"
          />
          {pptFile ? (
            <p className="mt-1 text-xs text-zinc-500">선택됨: {pptFile.name}</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              {TEAM_ATTACHMENT_HINT} · 최대 50MB
            </p>
          )}
        </section>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="team-project-topic"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              주제
            </label>
            <Button
              type="button"
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isBusy}
              onClick={() => void handleSaveMeta()}
            >
              {isSavingMeta ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                "주제·GitHub 저장"
              )}
            </Button>
          </div>
          <input
            id="team-project-topic"
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            disabled={isBusy}
            placeholder="조 프로젝트 주제를 입력하세요"
            className="mt-1.5 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="team-project-github"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            코드 GitHub 주소
          </label>
          <input
            id="team-project-github"
            type="url"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            disabled={isBusy}
            placeholder="https://github.com/organization/repository"
            className="mt-1.5 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        <section>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-4 text-zinc-500" aria-hidden />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              피드백
            </span>
          </div>

          <div
            ref={feedbackListRef}
            className="mt-2 max-h-56 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-700"
          >
            {feedbackComments.length === 0 ? (
              <p className="px-3 py-4 text-xs text-zinc-500 text-center">
                아직 피드백이 없습니다. 아래에 내용을 입력하고 등록하세요.
              </p>
            ) : (
              feedbackComments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const isProcessing = processingCommentId === comment.id;

                return (
                  <article key={comment.id} className="px-3 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {comment.authorName}
                        </span>
                        <time
                          dateTime={comment.createdAt}
                          className="text-[11px] text-zinc-400"
                        >
                          {feedbackDateFormatter.format(
                            new Date(comment.createdAt),
                          )}
                        </time>
                      </div>
                      {!isEditing ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStartEditComment(comment)}
                            className="text-[11px] text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                          >
                            수정
                          </button>
                          <span className="text-zinc-300" aria-hidden>
                            |
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteComment(comment)}
                            className="text-[11px] text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                          >
                            {isProcessing && !isEditing ? "삭제 중" : "삭제"}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(event) =>
                            setEditingCommentText(event.target.value)
                          }
                          disabled={isProcessing}
                          rows={3}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-2 text-sm text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessing}
                            onClick={handleCancelEditComment}
                          >
                            취소
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                            disabled={isProcessing || !editingCommentText.trim()}
                            onClick={() => void handleSaveEditComment(comment.id)}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                저장 중
                              </>
                            ) : (
                              "저장"
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                        {comment.content}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>

          <textarea
            id="team-project-feedback-new"
            value={newFeedbackText}
            onChange={(event) => setNewFeedbackText(event.target.value)}
            disabled={isBusy}
            rows={3}
            placeholder="피드백을 입력한 뒤 등록하세요"
            className="mt-2 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy || !newFeedbackText.trim()}
              onClick={() => void handleAddFeedback()}
            >
              {isPostingFeedback ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  등록 중...
                </>
              ) : (
                "피드백 등록"
              )}
            </Button>
          </div>
        </section>

        {/* 조장/조원별 평가표 (요청: 피드백 아래로 이동) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                조별 평가 (조장·조원별)
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                각 항목은 20점 만점이며, 총점은 100점입니다.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isBusy}
              onClick={() => void handleSaveEvaluations()}
            >
              {isSavingEvaluations ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  저장 중...
                </>
              ) : (
                "평가 저장"
              )}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-[1040px] w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-300">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 text-left w-[260px]">팀원</th>
                  <th className="px-3 py-2 text-center w-[90px]">주제(20)</th>
                  <th className="px-3 py-2 text-center w-[110px]">
                    업무분장(20)
                  </th>
                  <th className="px-3 py-2 text-center w-[110px]">
                    데이터분석(20)
                  </th>
                  <th className="px-3 py-2 text-center w-[110px]">
                    결과도출(20)
                  </th>
                  <th className="px-3 py-2 text-center w-[90px]">설명력(20)</th>
                  <th className="px-3 py-2 text-center w-[90px]">총점(100)</th>
                  <th className="px-3 py-2 text-center w-[70px]">등급</th>
                  <th className="px-3 py-2 text-left w-[260px]">
                    보완 및 피드백
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-950">
                {teamMembers.map((member) => {
                  const evaluation = getEvaluationOrDefault(member.id);
                  const total = computeTotal(evaluation);
                  const grade = computeGrade(total);
                  return (
                    <tr
                      key={member.id}
                      className="border-b last:border-b-0 border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="px-3 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {member.isLeader ? "조장" : "조원"}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={evaluation.workAssignment}
                            onChange={(e) =>
                              updateEvaluation(member.id, {
                                workAssignment: e.target.value,
                              })
                            }
                            className="ml-auto w-[160px] rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="업무 분장"
                          />
                        </div>
                      </td>

                      {(
                        [
                          ["topic", "topic"],
                          ["responsibility", "responsibility"],
                          ["dataAnalysis", "dataAnalysis"],
                          ["resultQuality", "resultQuality"],
                          ["explanation", "explanation"],
                        ] as const
                      ).map(([key, field]) => (
                        <td key={key} className="px-3 py-2 text-center">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={20}
                            value={String(evaluation[field])}
                            onChange={(e) =>
                              updateEvaluation(member.id, {
                                [field]: clampScore(e.target.value),
                              } as Partial<TeamMemberEvaluation>)
                            }
                            className="w-16 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-center text-xs text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}

                      <td className="px-3 py-2 text-center font-semibold text-zinc-900 dark:text-zinc-100">
                        {total}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-zinc-700 dark:text-zinc-200">
                        {grade}
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={evaluation.feedback}
                          onChange={(e) =>
                            updateEvaluation(member.id, {
                              feedback: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-2 text-xs text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="보완점/피드백을 입력하세요"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {errorMessage ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}

