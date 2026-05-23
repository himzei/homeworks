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
  castLadderVoteBallot,
  computeLadderVoteResults,
  createLadderVote,
  deleteLadderVote,
  describeVoteError,
  listVotesForLadder,
  startLadderVote,
  type LadderVoteRecord,
} from "@/lib/ladder-votes";
import { cn } from "@/lib/utils";

type LadderVotePanelProps = {
  ladderGameId: string;
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
  return status === "draft" ? "작성 중" : "투표 중";
}

type LadderVotePanelContentProps = LadderVotePanelProps;

/**
 * 사다리 상세 오른쪽 투표 게시판.
 * - 목록 / 작성 / 상세(투표·결과)
 * - 로그인 사용자만 투표
 * - 익명·실명 결과 표시
 */
export default function LadderVotePanel({
  ladderGameId,
}: LadderVotePanelContentProps) {
  const { user, profile, isLoading: isSessionLoading } = useSession();
  const [votes, setVotes] = useState<LadderVoteRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [view, setView] = useState<PanelView>("list");
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // 작성 폼
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftIsAnonymous, setDraftIsAnonymous] = useState(false);
  const [draftOptionLabels, setDraftOptionLabels] = useState(["", ""]);

  // 상세: 투표 선택
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");

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
    setVotes(listVotesForLadder(ladderGameId));
  }, [ladderGameId]);

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

  const resultRows = useMemo(
    () => (selectedVote ? computeLadderVoteResults(selectedVote) : []),
    [selectedVote],
  );

  const totalBallots = selectedVote?.ballots.length ?? 0;
  const isAuthor =
    Boolean(selectedVote && currentUserId) &&
    selectedVote?.authorUserId === currentUserId;

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

  const openDetail = useCallback((voteId: string) => {
    setSelectedVoteId(voteId);
    setSelectedOptionId("");
    setFormError(null);
    setView("detail");
  }, []);

  const handleCreateVote = useCallback(() => {
    if (!currentUserId) {
      setFormError("로그인한 사용자만 투표를 만들 수 있습니다.");
      return;
    }

    const result = createLadderVote({
      ladderGameId,
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
    ladderGameId,
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
      className="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50"
      aria-label="투표"
    >
      <header className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
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
                }}
                aria-label="목록으로"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            ) : (
              <Vote className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
            )}
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50 truncate">
              {view === "list"
                ? "투표"
                : view === "create"
                  ? "새 투표 작성"
                  : selectedVote?.title ?? "투표 상세"}
            </h2>
          </div>
          {view === "list" ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              글쓰기
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          로그인한 사용자만 투표할 수 있습니다.
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
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
                        vote.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                      )}
                    >
                      {statusLabel(vote.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {vote.authorName} · {formatVoteDate(vote.createdAt)}
                    {vote.status === "active"
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
              {selectedVote.authorName} · {formatVoteDate(selectedVote.createdAt)}
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
                      <li
                        key={opt.id}
                        className="text-black dark:text-zinc-50"
                      >
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

                {myBallot ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    투표 완료했습니다. (
                    {
                      selectedVote.options.find(
                        (o) => o.id === myBallot.optionId,
                      )?.label
                    }
                    )
                  </p>
                ) : currentUserId ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-black dark:text-zinc-50">
                      항목을 선택하고 투표해 주세요
                    </p>
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
                    <Button
                      type="button"
                      className="w-full"
                      onClick={handleCastBallot}
                    >
                      투표하기
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}

            {/* 결과 (진행 중이면 투표 후에도, 초안이면 0표) */}
            {(selectedVote.status === "active" ||
              selectedVote.ballots.length > 0) ? (
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
                  className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 space-y-3"
                >
                  <div>
                    <p className="text-base font-bold text-black dark:text-zinc-50">
                      {selectedVote.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      총 {totalBallots}표 ·{" "}
                      {selectedVote.isAnonymous ? "익명" : "실명"} ·{" "}
                      {formatVoteDate(
                        selectedVote.startedAt ?? selectedVote.createdAt,
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
    </section>
  );
}
