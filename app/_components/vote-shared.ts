import type { LadderVoteRecord } from "@/lib/ladder-votes";
import { cn } from "@/lib/utils";

/** 투표 종료 카운트다운 (초) */
export const VOTE_END_COUNTDOWN_SECONDS = 5;

/** 작성일 표시용 포매터 (Hydration 안정성을 위해 모듈 스코프) */
export const voteDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const voteInputClassName =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-black dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function statusLabel(status: LadderVoteRecord["status"]): string {
  switch (status) {
    case "draft":
      return "작성 중";
    case "active":
      return "투표 중";
    case "closed":
      return "종료";
  }
}

export function statusBadgeClass(status: LadderVoteRecord["status"]): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    case "closed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  }
}

export function voteStatusBadgeClass(status: LadderVoteRecord["status"]): string {
  return cn(
    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
    statusBadgeClass(status),
  );
}
