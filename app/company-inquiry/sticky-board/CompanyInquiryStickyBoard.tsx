"use client";

import { Download, Pencil, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { isAbortError } from "@/lib/errors/is-abort-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/_components/ui/button";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";

type CompanyInquiryPostRow = {
  id: string;
  author_id: string;
  author_name: string | null;
  is_anonymous: boolean;
  content: string;
  note_color: string;
  rotate_deg: number;
  created_at: string;
};

type Props = {
  initialPosts: CompanyInquiryPostRow[];
  currentUserId: string;
  /** 실명 작성 시 사용할 이름 (profiles.name) */
  currentUserName: string;
};

const POST_SELECT_FIELDS =
  "id, author_id, author_name, is_anonymous, content, note_color, rotate_deg, created_at";

const NOTE_COLORS: { key: string; className: string }[] = [
  { key: "yellow", className: "bg-[#FFF6A6] text-zinc-900" },
  { key: "pink", className: "bg-[#FFD3E2] text-zinc-900" },
  { key: "green", className: "bg-[#CFF7D6] text-zinc-900" },
  { key: "blue", className: "bg-[#CFE9FF] text-zinc-900" },
];

function pickRandom<T>(list: readonly T[], fallback: T): T {
  if (!list.length) return fallback;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] ?? fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatKoreanTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Supabase/PostgREST 오류를 사용자에게 보여줄 문구로 변환 */
function getMutationErrorMessage(
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  },
  fallback: string,
): string {
  if (error.code === "PGRST205" || error.message?.includes("company_inquiry_posts")) {
    return "게시판 테이블이 아직 준비되지 않았습니다. 관리자에게 DB 마이그레이션 적용을 요청해 주세요.";
  }
  if (error.code === "42501" || error.message?.toLowerCase().includes("policy")) {
    return "권한이 없습니다. 로그인·승인 상태를 확인해 주세요.";
  }
  return error.message || error.details || error.hint || fallback;
}

/** 포스트잇 상단에 붙는 테이프 장식 (노트 밖에 두어 잘림 방지) */
function StickyNoteTape() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 z-10 h-5 w-19 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-black/10 bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
      aria-hidden
    />
  );
}

function validatePostContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return "내용을 입력해 주세요.";
  if (trimmed.length > 400) return "내용은 400자 이내로 작성해 주세요.";
  return null;
}

export default function CompanyInquiryStickyBoard({
  initialPosts,
  currentUserId,
  currentUserName,
}: Props) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const boardCaptureRef = useRef<HTMLElement>(null);

  const [posts, setPosts] = useState<CompanyInquiryPostRow[]>(initialPosts);

  // 작성 폼 상태
  const [content, setContent] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(
    null,
  );

  const postCountLabel = useMemo(() => {
    const count = posts.length;
    return `${count}개`;
  }, [posts.length]);

  const handleSubmit = async () => {
    const validationError = validatePostContent(content);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const trimmed = content.trim();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrorMessage("로그인이 필요합니다. 다시 로그인해 주세요.");
        return;
      }

      const selectedColor = pickRandom(NOTE_COLORS, NOTE_COLORS[0]).key;
      // DB 컬럼이 SMALLINT이므로 정수만 저장
      const rotateDeg = clampNumber(Math.round(Math.random() * 12 - 6), -6, 6);

      const insertPayload = {
        author_id: user.id,
        content: trimmed,
        is_anonymous: isAnonymous,
        author_name: isAnonymous ? null : currentUserName,
        note_color: selectedColor,
        rotate_deg: rotateDeg,
      };

      const { data, error } = await supabase
        .from("company_inquiry_posts")
        .insert(insertPayload)
        .select(POST_SELECT_FIELDS)
        .single();

      if (error) {
        console.error("기업(문의) 게시글 등록 실패:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setErrorMessage(
          getMutationErrorMessage(error, "게시글 등록 중 오류가 발생했습니다."),
        );
        return;
      }

      if (!data) {
        setErrorMessage("게시글 등록에 실패했습니다.");
        return;
      }

      // 최신 글이 맨 위에 보이도록
      setPosts((prev) => [data, ...prev]);
      setContent("");
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("기업(문의) 게시글 등록 예외:", error);
      setErrorMessage("게시글 등록 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadBoardImage = async () => {
    const captureTarget = boardCaptureRef.current;
    if (!captureTarget || posts.length === 0) return;

    setIsDownloadingImage(true);
    setDownloadErrorMessage(null);

    try {
      const dateLabel = new Date().toISOString().slice(0, 10);
      await downloadElementAsPng(
        captureTarget,
        sanitizeDownloadFilename(`기업문의_포스트잇_${dateLabel}`),
      );
    } catch (error) {
      console.error("포스트잇 게시판 이미지 저장 실패:", error);
      setDownloadErrorMessage(
        "이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),rgba(255,255,255,0)),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.5),rgba(255,255,255,0)),linear-gradient(180deg,#0B1220,#0B1220)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              기업(문의) 포스트잇 게시판
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              문의 내용을 남기면 포스트잇으로 게시판에 붙습니다.{" "}
              <span className="text-white/85">익명/실명 선택</span>이 가능합니다.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch sm:items-end gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadBoardImage}
              disabled={posts.length === 0 || isDownloadingImage}
              className="border-white/25 text-primary hover:bg-white/10"
              data-export-ignore
            >
              <Download className="size-4" aria-hidden />
              {isDownloadingImage ? "저장 중..." : "이미지 다운로드"}
            </Button>
            {downloadErrorMessage ? (
              <p className="text-xs text-red-200">{downloadErrorMessage}</p>
            ) : null}
          </div>
        </header>

        {/* 작성 영역 */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-sm text-white/80">
              전체 포스트잇: <span className="font-semibold">{postCountLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm transition-colors",
                  isAnonymous
                    ? "bg-white text-zinc-900"
                    : "bg-white/10 text-white hover:bg-white/15",
                ].join(" ")}
              >
                익명
              </button>
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm transition-colors",
                  !isAnonymous
                    ? "bg-white text-zinc-900"
                    : "bg-white/10 text-white hover:bg-white/15",
                ].join(" ")}
              >
                실명
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="기업/기관 문의 내용을 적어주세요. (최대 400자)"
              className="min-h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-white/30"
              maxLength={400}
              disabled={isSubmitting}
            />

            <div className="flex sm:flex-col gap-2 justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-32"
              >
                {isSubmitting ? "붙이는 중..." : "포스트잇 붙이기"}
              </Button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}
        </section>

        {/* 게시판 (이미지 캡처 대상) */}
        <section
          ref={boardCaptureRef}
          aria-label="포스트잇 게시판"
          className="overflow-visible rounded-2xl border border-white/10 bg-[#0f172a] p-4 sm:p-6"
        >
          <p className="mb-4 text-sm font-medium text-white/80">
            기업(문의) 포스트잇 · {postCountLabel}
          </p>

          {posts.length === 0 ? (
            <div className="text-center py-16 text-white/70">
              아직 붙은 포스트잇이 없습니다. 첫 문의를 남겨보세요.
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 overflow-visible pt-2 [column-fill:_balance]">
              {posts.map((post) => (
                <StickyNote
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onUpdated={(updated) =>
                    setPosts((prev) =>
                      prev.map((item) => (item.id === updated.id ? updated : item)),
                    )
                  }
                  onDeleted={(postId) =>
                    setPosts((prev) => prev.filter((item) => item.id !== postId))
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type StickyNoteProps = {
  post: CompanyInquiryPostRow;
  currentUserId: string;
  currentUserName: string;
  onUpdated: (post: CompanyInquiryPostRow) => void;
  onDeleted: (postId: string) => void;
};

function StickyNote({
  post,
  currentUserId,
  currentUserName,
  onUpdated,
  onDeleted,
}: StickyNoteProps) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const isOwner = post.author_id === currentUserId;
  const colorClass =
    NOTE_COLORS.find((c) => c.key === post.note_color)?.className ??
    NOTE_COLORS[0].className;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editIsAnonymous, setEditIsAnonymous] = useState(post.is_anonymous);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const authorLabel = post.is_anonymous ? "익명" : post.author_name || "실명";
  const createdLabel = formatKoreanTime(post.created_at);

  const startEditing = () => {
    setEditContent(post.content);
    setEditIsAnonymous(post.is_anonymous);
    setActionError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditContent(post.content);
    setEditIsAnonymous(post.is_anonymous);
    setActionError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const validationError = validatePostContent(editContent);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setIsSaving(true);
    setActionError(null);

    try {
      const trimmed = editContent.trim();
      const { data, error } = await supabase
        .from("company_inquiry_posts")
        .update({
          content: trimmed,
          is_anonymous: editIsAnonymous,
          author_name: editIsAnonymous ? null : currentUserName,
        })
        .eq("id", post.id)
        .eq("author_id", currentUserId)
        .select(POST_SELECT_FIELDS)
        .single();

      if (error) {
        console.error("기업(문의) 게시글 수정 실패:", error);
        setActionError(
          getMutationErrorMessage(error, "수정 중 오류가 발생했습니다."),
        );
        return;
      }

      if (!data) {
        setActionError("수정에 실패했습니다.");
        return;
      }

      onUpdated(data);
      setIsEditing(false);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("기업(문의) 게시글 수정 예외:", error);
      setActionError("수정 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 포스트잇을 삭제할까요?")) return;

    setIsDeleting(true);
    setActionError(null);

    try {
      const { error } = await supabase
        .from("company_inquiry_posts")
        .delete()
        .eq("id", post.id)
        .eq("author_id", currentUserId);

      if (error) {
        console.error("기업(문의) 게시글 삭제 실패:", error);
        setActionError(
          getMutationErrorMessage(error, "삭제 중 오류가 발생했습니다."),
        );
        return;
      }

      onDeleted(post.id);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("기업(문의) 게시글 삭제 예외:", error);
      setActionError("삭제 중 예기치 않은 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="mb-4 break-inside-avoid overflow-visible pt-3"
      style={{
        transform: `rotate(${post.rotate_deg}deg)`,
      }}
    >
      <div className="relative">
        <StickyNoteTape />
        <article
          className={[
            "overflow-visible rounded-[18px] border border-black/10 shadow-[0_10px_22px_rgba(0,0,0,0.18)]",
            "p-4 sm:p-5",
            colorClass,
          ].join(" ")}
        >
      <header className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{authorLabel}</div>
        {createdLabel ? (
          <time className="text-xs text-black/55" dateTime={post.created_at}>
            {createdLabel}
          </time>
        ) : null}
      </header>

      {isEditing ? (
        <div className="mt-3 space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-black/15 bg-white/70 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-black/20"
            maxLength={400}
            disabled={isSaving || isDeleting}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditIsAnonymous(true)}
              disabled={isSaving || isDeleting}
              className={[
                "px-2.5 py-1 rounded-full text-xs transition-colors",
                editIsAnonymous
                  ? "bg-zinc-900 text-white"
                  : "bg-white/70 text-zinc-700 hover:bg-white",
              ].join(" ")}
            >
              익명
            </button>
            <button
              type="button"
              onClick={() => setEditIsAnonymous(false)}
              disabled={isSaving || isDeleting}
              className={[
                "px-2.5 py-1 rounded-full text-xs transition-colors",
                !editIsAnonymous
                  ? "bg-zinc-900 text-white"
                  : "bg-white/70 text-zinc-700 hover:bg-white",
              ].join(" ")}
            >
              실명
            </button>
          </div>

          <div
            className="flex flex-wrap gap-2"
            data-export-ignore
          >
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelEditing}
              disabled={isSaving || isDeleting}
              className="border-black/20 bg-white/70 text-zinc-800 hover:bg-white"
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-black/85">
          {post.content}
        </p>
      )}

      {isOwner && !isEditing ? (
        <div
          className="mt-4 flex flex-wrap gap-2 border-t border-black/10 pt-3"
          data-export-ignore
        >
          <button
            type="button"
            onClick={startEditing}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-black/5 disabled:opacity-50"
          >
            <Pencil className="size-3.5" aria-hidden />
            수정
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" aria-hidden />
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-2 text-xs text-red-700">{actionError}</p>
      ) : null}
        </article>
      </div>
    </div>
  );
}

