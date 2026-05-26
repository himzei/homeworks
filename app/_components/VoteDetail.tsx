"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
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
  addLadderVoteOption,
  castLadderVoteBallot,
  computeLadderVoteResults,
  deleteLadderVote,
  describeVoteError,
  endLadderVote,
  fetchLadderVote,
  startLadderVote,
  type LadderVoteRecord,
} from "@/lib/ladder-votes";
import { cn } from "@/lib/utils";
import VoteFireworks from "@/app/_components/VoteFireworks";
import {
  VOTE_END_COUNTDOWN_SECONDS,
  voteDateFormatter,
  voteInputClassName,
} from "@/app/_components/vote-shared";

type VoteDetailProps = {
  voteId: string;
};

/**
 * 투표 상세 화면.
 * - 초안 확인 / 투표 진행 / 결과 발표
 * - 로그인 사용자만 투표 가능
 */
export default function VoteDetail({ voteId }: VoteDetailProps) {
  const router = useRouter();
  const { user, profile, isLoading: isSessionLoading } = useSession();

  const [vote, setVote] = useState<LadderVoteRecord | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [endCountdown, setEndCountdown] = useState<number | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState("");
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

  const reloadVote = useCallback(async () => {
    const data = await fetchLadderVote(voteId);
    setVote(data);
  }, [voteId]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      await reloadVote();
      if (!isActive) return;
      setIsHydrated(true);
    })();

    return () => {
      isActive = false;
    };
  }, [reloadVote]);

  const myBallot = useMemo(() => {
    if (!vote || !currentUserId) return null;
    return (
      vote.ballots.find((ballot) => ballot.userId === currentUserId) ?? null
    );
  }, [vote, currentUserId]);

  const hasVoted = Boolean(myBallot);
  const isVoteSelectionChanged =
    hasVoted &&
    Boolean(selectedOptionId) &&
    selectedOptionId !== myBallot?.optionId;
  const canSubmitBallot =
    Boolean(selectedOptionId) && (!hasVoted || isVoteSelectionChanged);

  useEffect(() => {
    if (!vote) return;
    if (myBallot) {
      setSelectedOptionId(myBallot.optionId);
    } else {
      setSelectedOptionId("");
    }
  }, [vote?.id, myBallot?.optionId]);

  const resultRows = useMemo(
    () => (vote ? computeLadderVoteResults(vote) : []),
    [vote],
  );

  const totalBallots = vote?.ballots.length ?? 0;
  const isAuthor =
    Boolean(vote && currentUserId) && vote?.authorUserId === currentUserId;
  const showVoteResults = vote?.status === "closed";
  const isEndingVote = endCountdown !== null;

  const resetEndVoteUi = useCallback(() => {
    setEndCountdown(null);
    setShowFireworks(false);
  }, []);

  const handleStartEndVote = useCallback(() => {
    if (!vote || !currentUserId || !isAuthor) return;
    if (vote.status !== "active") return;
    if (
      !window.confirm(
        "투표를 종료할까요? 5초 후 폭죽과 함께 결과가 발표됩니다.",
      )
    ) {
      return;
    }
    setFormError(null);
    setEndCountdown(VOTE_END_COUNTDOWN_SECONDS);
  }, [vote, currentUserId, isAuthor]);

  useEffect(() => {
    if (endCountdown === null) return;

    if (endCountdown <= 0) {
      let isActive = true;
      (async () => {
        if (!vote || !currentUserId) {
          setEndCountdown(null);
          return;
        }

        const result = await endLadderVote(vote.id, currentUserId);
        if (!isActive) return;
        if ("error" in result) {
          setFormError(describeVoteError(result.error));
          setEndCountdown(null);
          return;
        }

        await reloadVote();
        if (!isActive) return;
        setEndCountdown(null);
        setShowFireworks(true);
      })();

      return () => {
        isActive = false;
      };
    }

    const timerId = window.setTimeout(() => {
      setEndCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [endCountdown, vote, currentUserId, reloadVote]);

  const handleStartVote = useCallback(async () => {
    if (!vote || !currentUserId) return;
    const result = await startLadderVote(vote.id, currentUserId);
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }
    await reloadVote();
    setFormError(null);
  }, [vote, currentUserId, reloadVote]);

  const handleAddActiveOption = useCallback(async () => {
    if (!vote || !currentUserId) return;

    const result = await addLadderVoteOption(
      vote.id,
      currentUserId,
      newActiveOptionLabel,
    );
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }

    await reloadVote();
    setNewActiveOptionLabel("");
    setFormError(null);
  }, [vote, currentUserId, newActiveOptionLabel, reloadVote]);

  const handleCastBallot = useCallback(async () => {
    if (!vote || !currentUserId) {
      setFormError("로그인한 사용자만 투표할 수 있습니다.");
      return;
    }
    if (!selectedOptionId) {
      setFormError("선택지를 골라 주세요.");
      return;
    }

    const result = await castLadderVoteBallot(
      vote.id,
      currentUserId,
      currentUserName,
      selectedOptionId,
    );
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }
    await reloadVote();
    setFormError(null);
  }, [
    vote,
    currentUserId,
    currentUserName,
    selectedOptionId,
    reloadVote,
  ]);

  const handleDeleteVote = useCallback(async () => {
    if (!vote || !currentUserId) return;
    if (!window.confirm(`"${vote.title}" 투표를 삭제할까요?`)) return;

    const result = await deleteLadderVote(vote.id, currentUserId);
    if ("error" in result) {
      setFormError(describeVoteError(result.error));
      return;
    }

    router.push("/vote");
  }, [vote, currentUserId, router]);

  const handleFireworksComplete = useCallback(() => {
    setShowFireworks(false);
  }, []);

  const handleDownloadResults = useCallback(async () => {
    const element = resultsExportRef.current;
    if (!element || !vote) return;

    setIsDownloadingImage(true);
    try {
      const filename = sanitizeDownloadFilename(`${vote.title}-투표결과`);
      await downloadElementAsPng(element, filename);
    } catch {
      window.alert("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDownloadingImage(false);
    }
  }, [vote]);

  if (!isHydrated) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">불러오는 중...</p>
    );
  }

  if (!vote) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          존재하지 않는 투표입니다
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          이미 삭제되었거나, 다른 브라우저에서 만든 투표일 수 있습니다.
        </p>
        <Button asChild variant="outline">
          <Link href="/vote">
            <ArrowLeft className="size-4" aria-hidden />
            게시판으로
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <Link
          href="/vote"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          게시판
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
          {vote.title}
        </h1>
        {vote.description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {vote.description}
          </p>
        ) : null}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {vote.authorName} · {voteDateFormatter.format(new Date(vote.createdAt))}
          {vote.isAnonymous ? " · 익명" : " · 실명"}
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6">
        {formError ? (
          <p
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        {vote.status === "draft" && isAuthor ? (
          <Card className="py-4 gap-3">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-sm">작성 중</CardTitle>
              <CardDescription className="text-xs">
                선택지를 확인한 뒤 투표를 시작하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 space-y-2">
              <ul className="text-sm space-y-1">
                {vote.options.map((opt, index) => (
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

        {vote.status === "draft" && !isAuthor ? (
          <p className="text-sm text-zinc-500">
            작성자가 아직 투표를 시작하지 않았습니다.
          </p>
        ) : null}

        {vote.status === "active" ? (
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
                    onChange={(e) => setNewActiveOptionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddActiveOption();
                      }
                    }}
                    placeholder="새 선택지 이름"
                    maxLength={50}
                    className={voteInputClassName}
                    disabled={vote.options.length >= MAX_VOTE_OPTIONS}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleAddActiveOption}
                    disabled={vote.options.length >= MAX_VOTE_OPTIONS}
                  >
                    <Plus className="size-4" aria-hidden />
                    추가
                  </Button>
                </div>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  현재 {vote.options.length}/{MAX_VOTE_OPTIONS}개 · 추가해도
                  기존 투표는 유지됩니다
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
                        vote.options.find((o) => o.id === myBallot?.optionId)
                          ?.label
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
                  {vote.options.map((option) => (
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

        {vote.status === "closed" ? (
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            투표가 종료되었습니다. 최종 결과입니다.
          </p>
        ) : null}

        {showVoteResults ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
                결과 ({totalBallots}표)
              </h2>
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
                  {vote.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  총 {totalBallots}표 · {vote.isAnonymous ? "익명" : "실명"} ·{" "}
                  {voteDateFormatter.format(
                    new Date(
                      vote.endedAt ?? vote.startedAt ?? vote.createdAt,
                    ),
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
                  {!vote.isAnonymous && row.voters.length > 0 ? (
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
    </article>
  );
}
