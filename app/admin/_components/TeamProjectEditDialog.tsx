"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, MessageSquare, X } from "lucide-react";

import {
  TEAM_ATTACHMENT_ACCEPT,
  TEAM_ATTACHMENT_HINT,
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

type TeamProjectEditDialogProps = {
  isOpen: boolean;
  snapshotId: string;
  teamNumber: number;
  teamLabel: string;
  initialProject: TeamProjectInfo | null;
  onClose: () => void;
  onSaved: (teamNumber: number, project: TeamProjectInfo) => void;
};

/**
 * 조 카드 클릭 시 — 주제·GitHub·첨부파일·피드백(댓글) 입력
 */
export default function TeamProjectEditDialog({
  isOpen,
  snapshotId,
  teamNumber,
  teamLabel,
  initialProject,
  onClose,
  onSaved,
}: TeamProjectEditDialogProps) {
  const [topic, setTopic] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [deployUrl, setDeployUrl] = useState("");
  const [feedbackComments, setFeedbackComments] = useState<
    TeamProjectFeedbackComment[]
  >([]);
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [processingCommentId, setProcessingCommentId] = useState<
    string | null
  >(null);
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [existingPptFileName, setExistingPptFileName] = useState<string | null>(
    null,
  );
  const [removeExistingPpt, setRemoveExistingPpt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPostingFeedback, setIsPostingFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTopic(initialProject?.topic ?? "");
    setGithubUrl(initialProject?.githubUrl ?? "");
    setDeployUrl(initialProject?.deployUrl ?? "");
    setFeedbackComments(initialProject?.feedbackComments ?? []);
    setNewFeedbackText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setProcessingCommentId(null);
    setPptFile(null);
    setExistingPptFileName(initialProject?.pptFileName ?? null);
    setRemoveExistingPpt(false);
    setErrorMessage(null);
  }, [isOpen, initialProject, teamNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving && !isPostingFeedback) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isSaving, isPostingFeedback, onClose]);

  if (!isOpen) return null;

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

  const applyProjectUpdate = (project: TeamProjectInfo) => {
    setFeedbackComments(project.feedbackComments);
    onSaved(teamNumber, project);
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

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.set("teamNumber", String(teamNumber));
      formData.set("topic", topic);
      formData.set("githubUrl", githubUrl);
      formData.set("deployUrl", deployUrl);
      if (removeExistingPpt) {
        formData.set("removePpt", "true");
      }
      if (pptFile) {
        formData.set("pptFile", pptFile);
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

      onSaved(teamNumber, payload.project);
      onClose();
    } catch {
      setErrorMessage("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const showExistingPpt =
    !!existingPptFileName && !removeExistingPpt && !pptFile;

  const isBusy = isSaving || isPostingFeedback || processingCommentId !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-project-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="다이얼로그 닫기"
        onClick={() => {
          if (!isBusy) onClose();
        }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h2
              id="team-project-dialog-title"
              className="text-lg font-semibold text-black dark:text-zinc-50"
            >
              {teamLabel} 프로젝트 정보
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              주제·GitHub·배포주소·첨부는 저장 버튼으로, 피드백은 댓글처럼 추가합니다.
            </p>
          </div>

          <div>
            <label
              htmlFor="team-project-topic"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              주제
            </label>
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
            <div className="flex items-center gap-1.5">
              <MessageSquare className="size-4 text-zinc-500" aria-hidden />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                피드백
              </span>
            </div>

            <div
              ref={feedbackListRef}
              className="mt-2 max-h-48 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-700"
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
                              disabled={
                                isProcessing || !editingCommentText.trim()
                              }
                              onClick={() =>
                                void handleSaveEditComment(comment.id)
                              }
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
                        <p className="mt-1 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
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

          <div>
            <label
              htmlFor="team-project-deploy"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              팀 배포주소
            </label>
            <input
              id="team-project-deploy"
              type="url"
              value={deployUrl}
              onChange={(event) => setDeployUrl(event.target.value)}
              disabled={isBusy}
              placeholder="https://example.vercel.app"
              className="mt-1.5 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="team-project-ppt"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              첨부파일
            </label>
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
              <p className="mt-1 text-xs text-zinc-500">
                선택됨: {pptFile.name}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                {TEAM_ATTACHMENT_HINT} · 최대 50MB
              </p>
            )}
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
            >
              닫기
            </Button>
            <Button
              type="button"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => void handleSave()}
              disabled={isBusy}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "주제·주소·첨부 저장"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
