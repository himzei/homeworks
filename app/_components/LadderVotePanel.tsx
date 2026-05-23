"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Loader2,
  Plus,
  Trash2,
  Vote,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/_components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/app/_components/ui/radio-group";
import { useSession } from "@/lib/auth/SessionProvider";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import {
  MAX_VOTE_OPTIONS,
  MIN_VOTE_OPTIONS,
  addLadderVoteOption,
  castLadderVoteBallot,
  computeLadderVoteResults,
  createLadderVote,
  deleteLadderVote,
  describeVoteError,
  endLadderVote,
  listAllLadderVotes,
  startLadderVote,
  type LadderVoteRecord,
} from "@/lib/ladder-votes";
import { cn } from "@/lib/utils";
import VoteFireworks from "./VoteFireworks";

type LadderVotePanelProps = {
  /** 페이지 전체 레이아웃 (기본값 page) */
  variant?: "page" | "sidebar";
};

type PanelView = "list" | "create" | "detail";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatVoteDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: LadderVoteRecord["status"]): string {
  switch (status) {
    case "draft":
      return "작성 중";
    case "active":
      return "투표 중";
    case "closed":
      return "종료";
  }
}

function statusBadgeClass(status: LadderVoteRecord["status"]): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    case "closed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
}

const VOTE_END_COUNTDOWN_SECONDS = 5;

type LadderVotePanelContentProps = LadderVotePanelProps;

/**
 * 투표 게시판 (/vote).
 * - 목록 / 작성 / 상세(투표·결과)
 * - 로그인 사용자만 투표
 * - 익명·실명 결과 표시
 */
export default function LadderVotePanel({
  variant = "page",
}: LadderVotePanelContentProps) {
  const isPageLayout = variant === "page";

  const { user, profile, isLoading: isSessionLoading } = useSession();
  const [votes, setVotes] = useState<LadderVoteRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [view, setView] = useState<PanelView>("list");
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  /** 투표 종료 카운트다운 (초) */
  const [endCountdown, setEndCountdown] = useState<number | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);

  // 작성 폼
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftIsAnonymous, setDraftIsAnonymous] = useState(false);
  const [draftOptionLabels, setDraftOptionLabels] = useState(["", ""]);

  // 상세: 투표 선택
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  /** 투표 중 추가할 새 선택지 */
  const [newActiveOptionLabel, setNewActiveOptionLabel] = useState("");

  const resultsExportRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id ?? null;
  const currentUserName = useMemo(() => {
    const profileName =
      typeof profile?.name === "string" ? profile.name.trim() : "";
    if (profileName) return profileName;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [profile, user?.email]);

  const reloadVotes = useCallback(() => {
    setVotes(listAllLadderVotes());
  }, []);

  useEffect(() => {
    reloadVotes();
    setIsHydrated(true);
  }, [reloadVotes]);

  const selectedVote = useMemo(
    () => votes.find((vote) => vote.id === selectedVoteId) ?? null,
    [votes, selectedVoteId],
  );

  const myBallot = useMemo(() => {
    if (!selectedVote || !currentUserId) return null;
    return (
      selectedVote.ballots.find((ballot) => ballot.userId === currentUserId) ??
      null
    );
  }, [selectedVote, currentUserId]);

  const hasVoted = Boolean(myBallot);
  const isVoteSelectionChanged =
    hasVoted &&
    Boolean(selectedOptionId) &&
    selectedOptionId !== myBallot?.optionId;
  const canSubmitBallot =
    Boolean(selectedOptionId) && (!hasVoted || isVoteSelectionChanged);

  // 상세 진입·투표 반영 시 내 선택지 동기화
  useEffect(() => {
    if (view !== "detail" || !selectedVote) return;
    if (myBallot) {
      setSelectedOptionId(myBallot.optionId);
    } else {
      setSelectedOptionId("");
    }
  }, [view, selectedVote?.id, myBallot?.optionId]);

  const resultRows = useMemo(
    () => (selectedVote ? computeLadderVoteResults(selectedVote) : []),
    [selectedVote],
  );

  const totalBallots = selectedVote?.ballots.length ?? 0;
  const isAuthor =
    Boolean(selectedVote && currentUserId) &&
    selectedVote?.authorUserId === currentUserId;

  const showVoteResults = selectedVote?.status === "closed";
  const isEndingVote = endCountdown !== null;

  const resetEndVoteUi = useCallback(() => {
    setEndCountdown(null);
    setShowFireworks(false);
  }, []);

  const resetCreateForm = useCallback(() => {
    setDraftTitle("");
    setDraftDescription("");
    setDraftIsAnonymous(false);
    setDraftOptionLabels(["", ""]);
    setFormError(null);
  }, []);

  const openCreate = useCallback(() => {
    if (!currentUserId) {
      setFormError("투표를 만들려면 로그인해 주세요.");
      setView("create");
      return;
    }
    resetCreateForm();
    setView("create");
  }, [currentUserId, resetCreateForm]);

  const openDetail = useCallback(
    (voteId: string) => {
      setSelectedVoteId(voteId);
      setSelectedOptionId("");
      setNewActiveOptionLabel("");
      setFormError(null);
      resetEndVoteUi();
      setView("detail");
    },
    [resetEndVoteUi],
  );

  /** 작성자: 5초 카운트다운 후 투표 종료 + 폭죽 */
  const handleStartEndVote = useCallback(() => {
    if (!selectedVote || !currentUserId || !isAuthor) return;
    if (selectedVote.status !== "active") return;
    if (
      !window.confirm(
        "투표를 종료할까요? 5초 후 폭죽과 함께 결과가 발표됩니다.",
      )
    ) {
      return;
    }
    setFormError(null);
    setEndCountdown(VOTE_END_COUNTDOWN_SECONDS);
  }, [selectedVote, currentUserId, isAuthor]);

  useEffect(() => {
    if (endCountdown === null) return;

    if (endCountdown <= 0) {
      if (!selectedVote || !currentUserId) {
        setEndCountdown(null);
        return;
      }

      const result = endLadderVote(selectedVote.id, currentUserId);
      if ("error" in result) {
        setFormError(describeVoteError(result.error));
        setEndCountdown(null);
        return;
      }

      reloadVotes();
      setEndCountdown(null);
      setShowFireworks(true);
      return;
    }

    const timerId = window.setTimeout(() => {
      setEndCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [endCountdown, selectedVote, currentUserId, reloadVotes]);

  const handleCreateVote = useCallback(() => {
    if (!currentUserId) {
      setFormError("로그인한 사용자만 투표를 만들 수 있습니다.");
      return;
    }

    const result = createLadderVote({
      title: draftTitle,
      description: draftDescription,
      isAnonymous: draftIsAnonymous,
      optionLabels: draftOptionLabels,
      authorUserId: currentUserId,
      authorName: currentUserName || "작성자",
    });

    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }

    reloadVotes();
    openDetail(result.vote.id);
  }, [
    currentUserId,
    currentUserName,
    draftDescription,
    draftIsAnonymous,
    draftOptionLabels,
    draftTitle,
    openDetail,
    reloadVotes,
  ]);

  const handleStartVote = useCallback(() => {
    if (!selectedVote || !currentUserId) return;
    const result = startLadderVote(selectedVote.id, currentUserId);
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }
    reloadVotes();
    setFormError(null);
  }, [selectedVote, currentUserId, reloadVotes]);

  /** 작성자: 투표 진행 중 선택지 추가 */
  const handleAddActiveOption = useCallback(() => {
    if (!selectedVote || !currentUserId) return;

    const result = addLadderVoteOption(
      selectedVote.id,
      currentUserId,
      newActiveOptionLabel,
    );
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }

    reloadVotes();
    setNewActiveOptionLabel("");
    setFormError(null);
  }, [selectedVote, currentUserId, newActiveOptionLabel, reloadVotes]);

  const handleCastBallot = useCallback(() => {
    if (!selectedVote || !currentUserId) {
      setFormError("로그인한 사용자만 투표할 수 있습니다.");
      return;
    }
    if (!selectedOptionId) {
      setFormError("선택지를 골라 주세요.");
      return;
    }

    const result = castLadderVoteBallot(
      selectedVote.id,
      currentUserId,
      currentUserName,
      selectedOptionId,
    );
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }
    reloadVotes();
    setFormError(null);
  }, [
    selectedVote,
    currentUserId,
    currentUserName,
    selectedOptionId,
    reloadVotes,
  ]);

  const handleDeleteVote = useCallback(() => {
    if (!selectedVote || !currentUserId) return;
    if (!window.confirm(`"${selectedVote.title}" 투표를 삭제할까요?`)) return;

    const result = deleteLadderVote(selectedVote.id, currentUserId);
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }
    reloadVotes();
    setSelectedVoteId(null);
    setView("list");
    setFormError(null);
  }, [selectedVote, currentUserId, reloadVotes]);

  const handleFireworksComplete = useCallback(() => {
    setShowFireworks(false);
  }, []);

  const handleDownloadResults = useCallback(async () => {
    const element = resultsExportRef.current;
    if (!element || !selectedVote) return;

    setIsDownloadingImage(true);
    try {
      const filename = sanitizeDownloadFilename(
        `${selectedVote.title}-투표결과`,
      );
      await downloadElementAsPng(element, filename);
    } catch {
      window.alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDownloadingImage(false);
    }
  }, [selectedVote]);

  const handleAddOptionField = useCallback(() => {
    setDraftOptionLabels((prev) => {
      if (prev.length >= MAX_VOTE_OPTIONS) return prev;
      return [...prev, ""];
    });
  }, []);

  const handleRemoveOptionField = useCallback((index: number) => {
    setDraftOptionLabels((prev) => {
      if (prev.length <= MIN_VOTE_OPTIONS) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
        투표 불러오는 중...
      </div>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50",
        isPageLayout ? "min-h-[min(70vh,720px)]" : "h-full min-h-0",
      )}
      aria-label="투표"
    >
      <header
        className={cn(
          "shrink-0 border-b border-zinc-200 dark:border-zinc-800",
          isPageLayout ? "px-4 sm:px-6 py-4" : "px-4 py-3",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {view !== "list" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => {
                  setView("list");
                  setFormError(null);
                  resetEndVoteUi();
                }}
                aria-label="목록으로"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            ) : (
              <Vote
                className={cn(
                  "shrink-0 text-blue-600 dark:text-blue-400",
                  isPageLayout ? "size-6" : "size-4",
                )}
                aria-hidden
              />
            )}
            <h2
              className={cn(
                "font-semibold text-black dark:text-zinc-50 truncate",
                isPageLayout ? "text-xl sm:text-2xl" : "text-sm",
              )}
            >
              {view === "list"
                ? "투표"
                : view === "create"
                  ? "새 투표 작성"
                  : (selectedVote?.title ?? "투표 상세")}
            </h2>
          </div>
          {view === "list" ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              글쓰기
            </Button>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1 text-zinc-500 dark:text-zinc-400",
            isPageLayout ? "text-sm" : "text-xs",
          )}
        >
          로그인한 사용자만 투표할 수 있습니다.
        </p>
      </header>

      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          isPageLayout ? "p-4 sm:p-6" : "p-3",
        )}
      >
        {formError ? (
          <p
            className="mb-3 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {/* —— 목록 —— */}
        {view === "list" ? (
          <div className="space-y-2">
            {votes.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
                아직 투표가 없습니다.
                <br />
                글쓰기로 첫 투표를 만들어 보세요.
              </p>
            ) : (
              votes.map((vote) => (
                <button
                  key={vote.id}
                  type="button"
                  onClick={() => openDetail(vote.id)}
                  className="w-full text-left rounded-lg border border-zinc-200 bg-white px-3 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-black dark:text-zinc-50 line-clamp-2">
                      {vote.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusBadgeClass(vote.status),
                      )}
                    >
                      {statusLabel(vote.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {vote.authorName} · {formatVoteDate(vote.createdAt)}
                    {vote.status !== "draft"
                      ? ` · ${vote.ballots.length}표`
                      : null}
                  </p>
                  {vote.isAnonymous ? (
                    <p className="mt-1 text-[10px] text-zinc-400">익명 투표</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-zinc-400">실명 투표</p>
                  )}
                </button>
              ))
            )}
          </div>
        ) : null}

        {/* —— 작성 —— */}
        {view === "create" ? (
          <div className="space-y-4">
            {!currentUserId && !isSessionLoading ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <Link href="/" className="underline font-medium">
                  로그인
                </Link>
                후 투표를 작성할 수 있습니다.
              </p>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                제목
              </span>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="투표 제목"
                maxLength={80}
                className={inputClassName}
                disabled={!currentUserId}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                설명 (선택)
              </span>
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="투표에 대한 설명"
                rows={2}
                maxLength={300}
                className={cn(inputClassName, "resize-none")}
                disabled={!currentUserId}
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                선택지 ({MIN_VOTE_OPTIONS}~{MAX_VOTE_OPTIONS}개)
              </span>
              {draftOptionLabels.map((label, index) => (
                <div key={`opt-field-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => {
                      const next = [...draftOptionLabels];
                      next[index] = e.target.value;
                      setDraftOptionLabels(next);
                    }}
                    placeholder={`선택지 ${index + 1}`}
                    maxLength={50}
                    className={inputClassName}
                    disabled={!currentUserId}
                  />
                  {draftOptionLabels.length > MIN_VOTE_OPTIONS ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveOptionField(index)}
                      aria-label={`선택지 ${index + 1} 삭제`}
                      disabled={!currentUserId}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ))}
              {draftOptionLabels.length < MAX_VOTE_OPTIONS ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOptionField}
                  disabled={!currentUserId}
                >
                  <Plus className="size-4" aria-hidden />
                  선택지 추가
                </Button>
              ) : null}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={draftIsAnonymous}
                onCheckedChange={(checked) =>
                  setDraftIsAnonymous(checked === true)
                }
                disabled={!currentUserId}
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">익명 투표</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  체크 시 결과에 투표자 이름이 표시되지 않습니다. (실명 투표는
                  체크 해제)
                </span>
              </span>
            </label>

            <Button
              type="button"
              className="w-full"
              onClick={handleCreateVote}
              disabled={!currentUserId}
            >
              저장 (초안)
            </Button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              저장 후 상세 화면에서 <strong>투표 시작</strong>을 누르면 다른
              사용자가 투표할 수 있습니다.
            </p>
          </div>
        ) : null}

        {/* —— 상세 —— */}
        {view === "detail" && selectedVote ? (
          <div className="space-y-4">
            {selectedVote.description ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {selectedVote.description}
              </p>
            ) : null}

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {selectedVote.authorName} ·{" "}
              {formatVoteDate(selectedVote.createdAt)}
              {selectedVote.isAnonymous ? " · 익명" : " · 실명"}
            </p>

            {/* 작성자: 초안 → 투표 시작 */}
            {selectedVote.status === "draft" && isAuthor ? (
              <Card className="py-4 gap-3">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">작성 중</CardTitle>
                  <CardDescription className="text-xs">
                    선택지를 확인한 뒤 투표를 시작하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 space-y-2">
                  <ul className="text-sm space-y-1">
                    {selectedVote.options.map((opt, index) => (
                      <li key={opt.id} className="text-black dark:text-zinc-50">
                        {index + 1}. {opt.label}
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleStartVote}
                  >
                    투표 시작
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {selectedVote.status === "draft" && !isAuthor ? (
              <p className="text-sm text-zinc-500">
                작성자가 아직 투표를 시작하지 않았습니다.
              </p>
            ) : null}

            {/* 진행 중: 투표 UI */}
            {selectedVote.status === "active" ? (
              <>
                {!currentUserId && !isSessionLoading ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    투표하려면{" "}
                    <Link href="/" className="underline font-medium">
                      로그인
                    </Link>
                    해 주세요.
                  </p>
                ) : null}

                {isEndingVote ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 text-center py-4">
                    {endCountdown}초 후 결과를 발표합니다…
                  </p>
                ) : null}

                {isAuthor && !isEndingVote ? (
                  <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-2">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      투표 중 항목 추가 (작성자)
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newActiveOptionLabel}
                        onChange={(e) =>
                          setNewActiveOptionLabel(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddActiveOption();
                          }
                        }}
                        placeholder="새 선택지 이름"
                        maxLength={50}
                        className={inputClassName}
                        disabled={
                          selectedVote.options.length >= MAX_VOTE_OPTIONS
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={handleAddActiveOption}
                        disabled={
                          selectedVote.options.length >= MAX_VOTE_OPTIONS
                        }
                      >
                        <Plus className="size-4" aria-hidden />
                        추가
                      </Button>
                    </div>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                      현재 {selectedVote.options.length}/{MAX_VOTE_OPTIONS}개 ·
                      추가해도 기존 투표는 유지됩니다
                    </p>
                  </div>
                ) : null}

                {currentUserId && !isEndingVote ? (
                  <div className="space-y-3">
                    {hasVoted ? (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        투표 완료:{" "}
                        <span className="font-medium">
                          {
                            selectedVote.options.find(
                              (o) => o.id === myBallot?.optionId,
                            )?.label
                          }
                        </span>
                        {" · "}
                        다른 항목을 고른 뒤{" "}
                        <span className="font-medium">투표 수정</span>을 누르면
                        변경됩니다.
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-black dark:text-zinc-50">
                        항목을 선택하고 투표해 주세요
                      </p>
                    )}
                    <RadioGroup
                      value={selectedOptionId}
                      onValueChange={setSelectedOptionId}
                    >
                      {selectedVote.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <RadioGroupItem value={option.id} id={option.id} />
                          <span className="text-sm text-black dark:text-zinc-50">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleCastBallot}
                        disabled={!canSubmitBallot}
                      >
                        {hasVoted ? "투표 수정" : "투표하기"}
                      </Button>
                      {isAuthor ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={handleStartEndVote}
                        >
                          투표 종료
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {selectedVote.status === "closed" ? (
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                투표가 종료되었습니다. 최종 결과입니다.
              </p>
            ) : null}

            {/* 결과 — 종료 후에만 공개 */}
            {showVoteResults ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-black dark:text-zinc-50">
                    결과 ({totalBallots}표)
                  </h3>
                  {totalBallots > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isDownloadingImage}
                      onClick={handleDownloadResults}
                      data-export-ignore
                    >
                      <Download className="size-4" aria-hidden />
                      {isDownloadingImage ? "저장 중..." : "결과 이미지"}
                    </Button>
                  ) : null}
                </div>

                <div
                  ref={resultsExportRef}
                  data-export-expand
                  className={cn(
                    "rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 space-y-3 transition-all duration-500",
                    showFireworks &&
                      "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20",
                  )}
                >
                  <div>
                    <p className="text-base font-bold text-black dark:text-zinc-50">
                      {selectedVote.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      총 {totalBallots}표 ·{" "}
                      {selectedVote.isAnonymous ? "익명" : "실명"} ·{" "}
                      {formatVoteDate(
                        selectedVote.endedAt ??
                          selectedVote.startedAt ??
                          selectedVote.createdAt,
                      )}
                    </p>
                  </div>

                  {resultRows.map((row) => (
                    <div key={row.optionId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-black dark:text-zinc-50">
                          {row.label}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {row.count}표 ({row.percent}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      {!selectedVote.isAnonymous && row.voters.length > 0 ? (
                        <ul className="text-xs text-zinc-500 dark:text-zinc-400 pl-1">
                          {row.voters.map((voter, voterIndex) => (
                            <li key={`${row.optionId}-${voterIndex}`}>
                              {voter.voterName}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}

                  {totalBallots === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-2">
                      아직 투표가 없습니다.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isAuthor ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 dark:text-red-400"
                onClick={handleDeleteVote}
                data-export-ignore
              >
                <Trash2 className="size-4" aria-hidden />
                투표 삭제
              </Button>
            ) : null}
          </div>
        ) : null}

        {view === "detail" && !selectedVote ? (
          <p className="text-sm text-zinc-500">투표를 찾을 수 없습니다.</p>
        ) : null}
      </div>

      {isEndingVote ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label="투표 종료 카운트다운"
        >
          <p className="text-7xl sm:text-8xl font-bold tabular-nums text-white drop-shadow-lg">
            {endCountdown}
          </p>
          <p className="mt-4 text-base sm:text-lg text-white/90">
            잠시 후 결과가 발표됩니다
          </p>
        </div>
      ) : null}

      <VoteFireworks
        isActive={showFireworks}
        onComplete={handleFireworksComplete}
      />
    </section>
  );
}
