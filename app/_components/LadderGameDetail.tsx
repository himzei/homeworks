"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Pencil,
  RotateCw,
  Save,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { useSession } from "@/lib/auth/SessionProvider";
import LadderBoard from "./LadderBoard";
import LadderVotePanel from "./LadderVotePanel";
import { deleteVotesForLadderGame } from "@/lib/ladder-votes";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  deleteLadderGame,
  getLadderGame,
  isLadderGamePlayed,
  markLadderGameAsPlayed,
  reshuffleLadderGame,
  shuffleStringArray,
  updateLadderGame,
  validateLadderInput,
  type LadderGameRecord,
  type LadderValidationError,
} from "@/lib/ladder";

type LadderGameDetailProps = {
  gameId: string;
};

type EditingDraft = {
  participantNames: string[];
  resultItems: string[];
};

function describeError(error: LadderValidationError): string {
  switch (error.kind) {
    case "count_out_of_range":
      return `참가자 수는 ${MIN_PARTICIPANTS}~${MAX_PARTICIPANTS}명 사이여야 합니다.`;
    case "names_empty":
      return `위쪽 ${error.index + 1}번 참가자 칸을 입력해 주세요.`;
    case "results_all_empty":
      return "아래쪽 결과 항목을 최소 1개 이상 입력해 주세요.";
    case "names_duplicated":
      return `참가자 이름이 중복되었습니다: "${error.name}"`;
  }
}

/** 모든 칸이 비어있는지 (= 새로 만든 사다리) */
function isLadderEmpty(game: LadderGameRecord): boolean {
  return (
    game.participantNames.every((name) => !name.trim()) &&
    game.resultItems.every((item) => !item.trim())
  );
}

/**
 * 사다리게임 상세(게시글) 화면.
 * - localStorage 단건 조회
 * - 수정 모드: 위쪽(참가자) / 아래쪽(결과 항목)을 인라인 input 으로 편집
 * - 비어있는 새 사다리는 자동으로 수정 모드 진입
 * - 가로줄 재추첨 / 삭제 지원
 */
export default function LadderGameDetail({ gameId }: LadderGameDetailProps) {
  const router = useRouter();
  const { user, profile } = useSession();
  const [game, setGame] = useState<LadderGameRecord | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const isEditing = editingDraft !== null;
  /** 한 번이라도 "게임 시작"을 누른 사다리는 결과 고정 */
  const isPlayed = game ? isLadderGamePlayed(game) : false;

  /** 로그인 사용자 표시 이름 (프로필 이름 > 이메일 로컬파트 > null) */
  const currentUserName = useMemo<string | null>(() => {
    const profileName =
      typeof profile?.name === "string" ? profile.name.trim() : "";
    if (profileName) return profileName;
    if (user?.email) return user.email.split("@")[0];
    return null;
  }, [profile, user?.email]);

  useEffect(() => {
    const loaded = getLadderGame(gameId);
    setGame(loaded);
    setIsHydrated(true);

    // 새로 생성된(빈) 사다리는 즉시 편집 모드로 진입
    if (loaded && isLadderEmpty(loaded)) {
      setEditingDraft({
        participantNames: [...loaded.participantNames],
        resultItems: [...loaded.resultItems],
      });
    }
  }, [gameId]);

  const handleStartEdit = useCallback(() => {
    if (!game) return;
    setEditingDraft({
      participantNames: [...game.participantNames],
      resultItems: [...game.resultItems],
    });
    setEditError(null);
  }, [game]);

  const handleCancelEdit = useCallback(() => {
    if (!game) return;
    // 빈 사다리에서 취소 시 → 작성 취소로 간주, 삭제 + 목록 이동
    if (isLadderEmpty(game)) {
      deleteLadderGame(game.id);
      router.push("/ladder");
      return;
    }
    setEditingDraft(null);
    setEditError(null);
  }, [game, router]);

  const handleSaveEdit = useCallback(() => {
    if (!editingDraft || !game) return;
    const trimmedNames = editingDraft.participantNames.map((name) =>
      name.trim(),
    );
    const trimmedResults = editingDraft.resultItems.map((item) => item.trim());

    const error = validateLadderInput(trimmedNames, trimmedResults);
    if (error) {
      setEditError(describeError(error));
      return;
    }

    const updated = updateLadderGame(game.id, {
      participantNames: trimmedNames,
      resultItems: trimmedResults,
    });
    if (!updated) {
      setEditError("저장에 실패했습니다.");
      return;
    }
    setGame(updated);
    setEditingDraft(null);
    setEditError(null);
  }, [editingDraft, game]);

  const handleParticipantNameChange = useCallback(
    (index: number, value: string) => {
      setEditingDraft((prev) => {
        if (!prev) return prev;
        const next = [...prev.participantNames];
        next[index] = value;
        return { ...prev, participantNames: next };
      });
      if (editError) setEditError(null);
    },
    [editError],
  );

  const handleResultItemChange = useCallback(
    (index: number, value: string) => {
      setEditingDraft((prev) => {
        if (!prev) return prev;
        const next = [...prev.resultItems];
        next[index] = value;
        return { ...prev, resultItems: next };
      });
      if (editError) setEditError(null);
    },
    [editError],
  );

  /** 일반 모드에서 빈 위쪽 칸 클릭 → 로그인 사용자 이름 자동 입력 */
  const handleEmptyParticipantClick = useCallback(
    (index: number) => {
      if (!game) return;

      if (!currentUserName) {
        window.alert("로그인 후 빈 칸에 본인 이름을 추가할 수 있습니다.");
        return;
      }

      const existingIndex = game.participantNames.findIndex(
        (existingName) => existingName.trim() === currentUserName,
      );
      if (existingIndex !== -1) {
        window.alert(
          `이미 "${currentUserName}" 으로 ${existingIndex + 1}번에 참여했습니다.`,
        );
        return;
      }

      const nextNames = [...game.participantNames];
      nextNames[index] = currentUserName;

      const updated = updateLadderGame(game.id, {
        participantNames: nextNames,
      });
      if (updated) {
        setGame({ ...updated });
      }
    },
    [game, currentUserName],
  );

  const handleReshuffle = useCallback(() => {
    if (!game) return;
    // 이미 게임이 시작된 사다리는 결과 고정 → 안전망으로 한 번 더 차단
    if (isLadderGamePlayed(game)) return;
    const updated = reshuffleLadderGame(game.id);
    if (updated) {
      // 새 객체로 setState 해야 자식 useMemo 가 무효화됨
      setGame({ ...updated });
    }
  }, [game]);

  /** 위쪽 참가자 칸 순서 무작위 섞기 (게임 시작 전만) */
  const handleShuffleParticipants = useCallback(() => {
    if (!game || isLadderGamePlayed(game)) return;
    const updated = updateLadderGame(game.id, {
      participantNames: shuffleStringArray(game.participantNames),
    });
    if (updated) {
      setGame({ ...updated });
    }
  }, [game]);

  /** 아래쪽 결과 칸 순서 무작위 섞기 (게임 시작 전만) */
  const handleShuffleResults = useCallback(() => {
    if (!game || isLadderGamePlayed(game)) return;
    const updated = updateLadderGame(game.id, {
      resultItems: shuffleStringArray(game.resultItems),
    });
    if (updated) {
      setGame({ ...updated });
    }
  }, [game]);

  /**
   * 사다리 보드에서 최초 "게임 시작" 누른 순간 호출.
   * - playedAt 을 영구 저장 → 새로고침 후에도 결과 고정 유지
   * - 이미 표시된 사다리면 멱등 (markLadderGameAsPlayed 내부에서 가드)
   */
  const handleGameStart = useCallback(() => {
    if (!game) return;
    if (isLadderGamePlayed(game)) return;
    const updated = markLadderGameAsPlayed(game.id);
    if (updated) {
      setGame({ ...updated });
    }
  }, [game]);

  const handleDelete = useCallback(() => {
    if (!game) return;
    if (!window.confirm(`"${game.title}" 사다리를 삭제할까요?`)) return;
    deleteLadderGame(game.id);
    deleteVotesForLadderGame(game.id);
    router.push("/ladder");
  }, [game, router]);

  // 편집 중에는 드래프트 값을 사다리 보드에 반영해 미리보기
  const boardGame = useMemo<LadderGameRecord | null>(() => {
    if (!game) return null;
    if (!editingDraft) return game;
    return {
      ...game,
      participantNames: editingDraft.participantNames,
      resultItems: editingDraft.resultItems,
    };
  }, [game, editingDraft]);

  if (!isHydrated) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">불러오는 중...</p>
    );
  }

  if (!game || !boardGame) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          존재하지 않는 사다리입니다
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          이미 삭제되었거나, 다른 브라우저에서 만든 사다리일 수 있습니다.
        </p>
        <Button asChild variant="outline">
          <Link href="/ladder">
            <ArrowLeft className="size-4" aria-hidden />
            게시판으로
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-3 h-full min-h-0">
      <header className="space-y-1 shrink-0">
        <Link
          href="/ladder"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          게시판
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-black dark:text-zinc-50">
          {game.title}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          참가자 {game.participantCount}명
        </p>
      </header>

      {/* 사다리 위쪽: 일반 모드의 액션들 (편집 모드에서는 숨김 → 저장/취소는 아래로 이동) */}
      {!isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          {/* 게임 시작된 사다리는 결과 고정 → 수정·재섞기 버튼 숨김 */}
          {!isPlayed ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
              >
                <Pencil className="size-4" aria-hidden />
                참가자·결과 수정
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShuffleParticipants}
              >
                <Shuffle className="size-4" aria-hidden />
                참가자 다시 섞기
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShuffleResults}
              >
                <Shuffle className="size-4" aria-hidden />
                결과 다시 섞기
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReshuffle}
              >
                <RotateCw className="size-4" aria-hidden />
                사다리 다시 섞기
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="size-4" aria-hidden />
            삭제
          </Button>
        </div>
      ) : null}

      {/* 안내 문구 */}
      {isEditing ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          위쪽(참가자)은 모두 채워주세요. 아래쪽(결과 항목)은{" "}
          <span className="font-medium text-black dark:text-zinc-50">
            최소 1개
          </span>
          만 채워도 됩니다 (나머지는 빈 칸으로 둬도 됩니다). 입력을 끝낸 뒤
          아래쪽 <strong>저장</strong> 버튼을 눌러주세요.
        </p>
      ) : isPlayed ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Lock className="size-3.5" aria-hidden />
          이미 게임이 시작된 사다리입니다. 결과 수정과 사다리 다시 섞기가
          불가합니다.
        </p>
      ) : isLadderEmpty(game) ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          아직 입력된 항목이 없습니다. <strong>참가자·결과 수정</strong>{" "}
          버튼으로 직접 채우거나, 빈 위쪽 칸을 클릭하면 본인 이름이 자동
          입력됩니다.
        </p>
      ) : null}

      {/* 사다리(왼쪽) + 투표(오른쪽) — 큰 화면에서 가로 배치 */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row lg:gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <LadderBoard
            game={boardGame}
            mode={isEditing ? "edit" : "play"}
            onParticipantNameChange={handleParticipantNameChange}
            onResultItemChange={handleResultItemChange}
            onEmptyParticipantClick={
              isEditing ? undefined : handleEmptyParticipantClick
            }
            onGameStart={handleGameStart}
            onShuffleParticipants={
              !isPlayed && !isEditing ? handleShuffleParticipants : undefined
            }
            onShuffleResults={
              !isPlayed && !isEditing ? handleShuffleResults : undefined
            }
          />
        </div>

        {!isEditing ? (
          <aside className="flex h-[min(420px,40vh)] shrink-0 flex-col lg:h-auto lg:w-[min(100%,22rem)] lg:max-w-sm">
            <LadderVotePanel ladderGameId={gameId} />
          </aside>
        ) : null}
      </div>

      {/* 사다리 아래쪽: 편집 모드의 저장/취소 + 검증 에러 */}
      {isEditing ? (
        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          {editError ? (
            <p
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {editError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSaveEdit}>
              <Save className="size-4" aria-hidden />
              저장
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelEdit}
            >
              <X className="size-4" aria-hidden />
              취소
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
