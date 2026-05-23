"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { useSession } from "@/lib/auth/SessionProvider";
import {
  MAX_VOTE_OPTIONS,
  MIN_VOTE_OPTIONS,
  createLadderVote,
  describeVoteError,
} from "@/lib/ladder-votes";
import { cn } from "@/lib/utils";
import { voteInputClassName } from "@/app/_components/vote-shared";

/**
 * 투표 게시판 글쓰기 폼.
 * - 제목·설명·선택지 입력 후 초안 저장
 * - 저장 후 상세 페이지에서 투표 시작
 */
export default function VoteForm() {
  const router = useRouter();
  const { user, profile, isLoading: isSessionLoading } = useSession();

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftIsAnonymous, setDraftIsAnonymous] = useState(false);
  const [draftOptionLabels, setDraftOptionLabels] = useState(["", ""]);
  const [formError, setFormError] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;
  const currentUserName = useMemo(() => {
    const profileName =
      typeof profile?.name === "string" ? profile.name.trim() : "";
    if (profileName) return profileName;
    if (user?.email) return user.email.split("@")[0];
    return "";
  }, [profile, user?.email]);

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

    router.push(`/vote/${result.vote.id}`);
  }, [
    currentUserId,
    currentUserName,
    draftDescription,
    draftIsAnonymous,
    draftOptionLabels,
    draftTitle,
    router,
  ]);

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-6">
      {formError ? (
        <p
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

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
          className={voteInputClassName}
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
          className={cn(voteInputClassName, "resize-none")}
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
              className={voteInputClassName}
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
          onCheckedChange={(checked) => setDraftIsAnonymous(checked === true)}
          disabled={!currentUserId}
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">익명 투표</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            체크 시 결과에 투표자 이름이 표시되지 않습니다. (실명 투표는 체크
            해제)
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
        저장 후 상세 화면에서 <strong>투표 시작</strong>을 누르면 다른 사용자가
        투표할 수 있습니다.
      </p>
    </div>
  );
}
