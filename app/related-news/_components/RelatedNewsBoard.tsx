"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import RelatedNewsPagination from "@/app/related-news/_components/RelatedNewsPagination";
import { isLikelyImageFileUrl } from "@/lib/related-news/article-image";
import {
  canEmbedRelatedNewsInIframe,
  canEmbedUrlInIframe,
  getArticleReadUrl,
  openArticleInNewTab,
} from "@/lib/related-news/article-open";
import { RELATED_NEWS_PAGE_SIZE } from "@/lib/related-news/constants";
import type { RelatedNewsListItem } from "@/lib/related-news/fetch-related-news-page";
import {
  normalizeNewsDescription,
  normalizeNewsTitle,
} from "@/lib/related-news/plain-text";
import { useAdmin } from "@/lib/auth/SessionProvider";

function NewsCardThumbnail({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(imageUrl) && !hasImageError;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div
          className={[
            "absolute inset-0",
            "bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.25),transparent_40%),radial-gradient(circle_at_30%_80%,rgba(236,72,153,0.18),transparent_45%)]",
          ].join(" ")}
          aria-hidden
        />
      )}

      <div
        className="absolute inset-0 bg-linear-to-b from-black/0 via-black/0 to-black/35"
        aria-hidden
      />
    </div>
  );
}

function formatKoreanDate(iso: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

function getHostname(urlText: string): string {
  try {
    const url = new URL(urlText);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function RelatedNewsBoard({
  items,
  boardTitle,
  basePath,
  currentPage,
  totalPages,
  totalCount,
}: {
  items: RelatedNewsListItem[];
  boardTitle: string;
  basePath: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const router = useRouter();
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const [selected, setSelected] = useState<RelatedNewsListItem | null>(null);
  const [preferredUrl, setPreferredUrl] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const modalUrl =
    preferredUrl || (selected ? getArticleReadUrl(selected) : "");
  const canShowIframeModal =
    selected !== null && canEmbedRelatedNewsInIframe(selected);
  const selectedTitle = selected ? normalizeNewsTitle(selected.title) : "";
  const publishedText = useMemo(
    () => (selected ? formatKoreanDate(selected.published_at) : ""),
    [selected],
  );

  const handleDelete = async (item: RelatedNewsListItem) => {
    const title = normalizeNewsTitle(item.title);
    if (!confirm(`"${title}" 기사를 삭제할까요?`)) return;

    setDeletingId(item.id);

    try {
      const response = await fetch(`/api/related-news/${item.id}`, {
        method: "DELETE",
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        window.alert(body?.error ?? "삭제에 실패했습니다.");
        return;
      }

      if (selected?.id === item.id) {
        setSelected(null);
        setPreferredUrl("");
      }

      router.refresh();
    } catch (error) {
      console.error("관련뉴스 삭제 오류:", error);
      window.alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const showAdminActions = isAdmin && !isCheckingAdmin;

  const handleArticleOpen = (item: RelatedNewsListItem) => {
    // 모달 iframe으로 볼 수 없는 기사(Google News·원문 언론사 등)는 새 탭으로 엽니다.
    if (!canEmbedRelatedNewsInIframe(item)) {
      openArticleInNewTab(getArticleReadUrl(item));
      return;
    }

    setSelected(item);
    setPreferredUrl(item.naver_link?.trim() || "");
  };

  const handleModalUrlSwitch = (url: string) => {
    if (!canEmbedUrlInIframe(url)) {
      openArticleInNewTab(url);
      setSelected(null);
      setPreferredUrl("");
      return;
    }
    setPreferredUrl(url);
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {boardTitle}
        </h1>
        <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          {totalCount > 0 ? (
            <p className="mt-0.5">
              총 {totalCount}건
              {totalPages > 1
                ? ` · ${currentPage}/${totalPages} 페이지 (${RELATED_NEWS_PAGE_SIZE}건/페이지)`
                : null}
            </p>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          아직 수집된 뉴스가 없습니다. (크론 호출 후 노출됩니다)
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const hostname = getHostname(item.origin_link);
            const publishedAt = formatKoreanDate(item.published_at);
            const displayTitle = normalizeNewsTitle(item.title);
            const summaryText = normalizeNewsDescription(
              item.description,
              displayTitle,
            );

            const isDeleting = deletingId === item.id;
            const opensInNewTab = !canEmbedRelatedNewsInIframe(item);

            return (
              <article
                key={item.id}
                className={[
                  "group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm",
                  "transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md",
                  "dark:border-zinc-800 dark:bg-zinc-950",
                  isDeleting ? "opacity-60" : "",
                ].join(" ")}
              >
                {showAdminActions ? (
                  <button
                    type="button"
                    aria-label="기사 삭제"
                    disabled={Boolean(deletingId)}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(item);
                    }}
                    className="absolute right-2 top-2 z-20 rounded-full bg-white/95 p-1.5 text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900/95 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleArticleOpen(item)}
                  className={[
                    "w-full text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900/30",
                    "dark:focus-visible:ring-zinc-100/20",
                  ].join(" ")}
                >
                  <NewsCardThumbnail
                    imageUrl={
                      item.image_url && isLikelyImageFileUrl(item.image_url)
                        ? item.image_url
                        : null
                    }
                    title={displayTitle}
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 aspect-video">
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="truncate rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-800 backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-100">
                        {hostname || "뉴스"}
                      </span>
                      {publishedAt ? (
                        <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 text-xs text-zinc-700 backdrop-blur dark:bg-zinc-950/80 dark:text-zinc-200">
                          {publishedAt}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-4">
                    {/* 제목은 항상 2줄 높이 고정 (1줄이어도 카드 높이 통일) */}
                    <p className="line-clamp-2 h-10 text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-50">
                      {displayTitle}
                    </p>
                    {summaryText ? (
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
                        {summaryText}
                      </p>
                    ) : (
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-500 dark:text-zinc-400">
                        요약 정보가 없는 기사입니다.
                      </p>
                    )}
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}

      <RelatedNewsPagination
        basePath={basePath}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* iframe 삽입 가능한 기사만 모달로 표시 */}
      {selected && canShowIframeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex h-[88vh] w-[min(1400px,96vw)] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {selectedTitle}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {publishedText ? `게시: ${publishedText}` : ""}{" "}
                  {selected.origin_link ? `· ${selected.origin_link}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* iframe 차단 대비: 네이버 링크/원문 링크 전환 */}
                {selected.naver_link &&
                canEmbedUrlInIframe(selected.naver_link) ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleModalUrlSwitch(selected.naver_link || "")
                    }
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    네이버로 보기
                  </button>
                ) : null}
                {canEmbedUrlInIframe(selected.origin_link) ? (
                  <button
                    type="button"
                    onClick={() => handleModalUrlSwitch(selected.origin_link)}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    원문으로 보기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openArticleInNewTab(selected.origin_link)}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    원문 새 탭
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    openArticleInNewTab(getArticleReadUrl(selected))
                  }
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  새 탭 열기
                </button>
                {showAdminActions ? (
                  <button
                    type="button"
                    disabled={Boolean(deletingId)}
                    onClick={() => void handleDelete(selected)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {deletingId === selected.id ? "삭제 중…" : "삭제"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white dark:bg-zinc-950">
              {modalUrl ? (
                <iframe
                  title={selectedTitle}
                  src={modalUrl}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-600 dark:text-zinc-300">
                  표시할 URL이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
