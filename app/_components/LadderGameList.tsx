"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui/button";
import {
  deleteLadderGame,
  listLadderGames,
  type LadderGameRecord,
} from "@/lib/ladder";
import { PencilLine, Trash2, Users } from "lucide-react";

/** 작성일 표시용 포매터 (Hydration 안정성을 위해 모듈 스코프) */
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * 사다리게임 게시판 목록.
 * - localStorage 에서 목록을 읽어 클라이언트에서 렌더
 * - 글쓰기 버튼은 /ladder/new 로 이동
 */
export default function LadderGameList() {
  // 첫 렌더에선 비어 있고 mount 후 채워짐 → SSR/Hydration 불일치 방지
  const [games, setGames] = useState<LadderGameRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setGames(listLadderGames());
    setIsHydrated(true);
  }, []);

  const handleDelete = useCallback((id: string, title: string) => {
    if (!window.confirm(`"${title}" 사다리를 삭제할까요?`)) return;
    deleteLadderGame(id);
    setGames(listLadderGames());
  }, []);

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-black dark:text-zinc-50">
            사다리게임 게시판
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            글쓰기 버튼으로 사다리를 만들고, 목록에서 다시 열어볼 수 있습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/ladder/new">
            <PencilLine className="size-4" aria-hidden />
            글쓰기
          </Link>
        </Button>
      </header>

      {!isHydrated ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          불러오는 중...
        </p>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            아직 만들어진 사다리가 없습니다.
          </p>
          <Button asChild className="mt-4">
            <Link href="/ladder/new">
              <PencilLine className="size-4" aria-hidden />첫 사다리 만들기
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {games.map((game) => (
            <li
              key={game.id}
              className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <Link
                href={`/ladder/${game.id}`}
                className="flex-1 min-w-0 flex flex-col gap-1"
              >
                <span className="text-sm sm:text-base font-medium text-black dark:text-zinc-50 truncate">
                  {game.title}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden />
                    {game.participantCount}명
                  </span>
                  <span>{dateFormatter.format(new Date(game.createdAt))}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(game.id, game.title)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                aria-label={`${game.title} 삭제`}
              >
                <Trash2 className="size-3.5" aria-hidden />
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
