"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import { useSession } from "@/lib/auth/SessionProvider";
import {
  deleteLadderVote,
  describeVoteError,
  listAllLadderVotes,
  type LadderVoteRecord,
} from "@/lib/ladder-votes";
import { PencilLine, Trash2 } from "lucide-react";
import {
  statusLabel,
  voteDateFormatter,
  voteStatusBadgeClass,
} from "@/app/_components/vote-shared";

/**
 * 투표 게시판 목록.
 * - localStorage 에서 목록을 읽어 클라이언트에서 렌더
 * - 글쓰기 버튼은 /vote/new 로 이동
 */
export default function VoteList() {
  const { user } = useSession();
  const currentUserId = user?.id ?? null;

  // 첫 렌더에선 비어 있고 mount 후 채워짐 → SSR/Hydration 불일치 방지
  const [votes, setVotes] = useState<LadderVoteRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const list = await listAllLadderVotes();
        if (!isActive) return;
        setVotes(list);
      } finally {
        if (!isActive) return;
        setIsHydrated(true);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const handleDelete = useCallback(
    async (vote: LadderVoteRecord) => {
      if (!currentUserId) return;
      if (!window.confirm(`"${vote.title}" 투표를 삭제할까요?`)) return;

      const result = await deleteLadderVote(vote.id, currentUserId);
      if ("error" in result) {
        window.alert(describeVoteError(result.error));
        return;
      }

      const list = await listAllLadderVotes();
      setVotes(list);
    },
    [currentUserId],
  );

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
            투표 게시판
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            글쓰기 버튼으로 투표를 만들고, 목록에서 다시 열어볼 수 있습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/vote/new">
            <PencilLine className="size-4" aria-hidden />
            글쓰기
          </Link>
        </Button>
      </header>

      {!isHydrated ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          불러오는 중...
        </p>
      ) : votes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            아직 만들어진 투표가 없습니다.
          </p>
          <Button asChild className="mt-4">
            <Link href="/vote/new">
              <PencilLine className="size-4" aria-hidden />첫 투표 만들기
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {votes.map((vote) => {
            const isAuthor = currentUserId === vote.authorUserId;

            return (
              <li
                key={vote.id}
                className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <Link
                  href={`/vote/${vote.id}`}
                  className="flex-1 min-w-0 flex flex-col gap-1"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm sm:text-base font-medium text-black dark:text-zinc-50 truncate">
                      {vote.title}
                    </span>
                    <span className={voteStatusBadgeClass(vote.status)}>
                      {statusLabel(vote.status)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{vote.authorName}</span>
                    <span>
                      {voteDateFormatter.format(new Date(vote.createdAt))}
                    </span>
                    {vote.status !== "draft" ? (
                      <span>{vote.ballots.length}표</span>
                    ) : null}
                    <span>{vote.isAnonymous ? "익명" : "실명"}</span>
                  </span>
                </Link>
                {isAuthor ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(vote)}
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label={`${vote.title} 삭제`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    삭제
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
