"use client";

import { useMemo, useState } from "react";
import { Building2, Copy, Download, FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/_components/ui/button";
import { formatKoreaDateTimeFromUtc } from "@/lib/format-date";
import type { CompanyInquiryAdminPost } from "@/lib/company-inquiry/fetch-company-inquiry-posts-for-admin";
import {
  formatShortGroupLabel,
  parseCohortNumberFromGroupName,
} from "@/lib/fetch-group-options";

type Props = {
  /** 현재 탭에 해당하는 글 목록 */
  posts: CompanyInquiryAdminPost[];
  /** 전체 글 수 (탭과 무관) */
  totalPostCount: number;
  /** 선택된 과정 (null이면 전체 탭) */
  selectedGroup: string | null;
};

type VisibilityFilter = "all" | "anonymous" | "named";

type CohortPostSection = {
  groupKey: string;
  groupName: string | null;
  shortLabel: string;
  posts: CompanyInquiryAdminPost[];
};

const UNASSIGNED_GROUP_KEY = "__unassigned__";

/** 취합 목록을 기수별로 묶고 최신 기수 우선 정렬 */
function groupAdminPostsByCohort(
  posts: CompanyInquiryAdminPost[],
): CohortPostSection[] {
  const sectionByKey = new Map<string, CohortPostSection>();

  for (const post of posts) {
    const trimmedGroupName = post.authorGroupName?.trim() || null;
    const groupKey = trimmedGroupName ?? UNASSIGNED_GROUP_KEY;
    const existing = sectionByKey.get(groupKey);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    sectionByKey.set(groupKey, {
      groupKey,
      groupName: trimmedGroupName,
      shortLabel: formatShortGroupLabel(trimmedGroupName),
      posts: [post],
    });
  }

  return [...sectionByKey.values()].toSorted((sectionA, sectionB) => {
    if (sectionA.groupKey === UNASSIGNED_GROUP_KEY) return 1;
    if (sectionB.groupKey === UNASSIGNED_GROUP_KEY) return -1;

    const cohortA = parseCohortNumberFromGroupName(sectionA.groupName ?? "");
    const cohortB = parseCohortNumberFromGroupName(sectionB.groupName ?? "");

    if (cohortA !== null && cohortB !== null && cohortB !== cohortA) {
      return cohortB - cohortA;
    }
    if (cohortA !== null && cohortB === null) return -1;
    if (cohortA === null && cohortB !== null) return 1;

    return (sectionA.groupName ?? "").localeCompare(
      sectionB.groupName ?? "",
      "ko",
    );
  });
}

function buildAggregatedText(
  posts: CompanyInquiryAdminPost[],
  showGroupColumn: boolean,
): string {
  const dateLabel = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `기업(문의) 취합 (${dateLabel})`,
    `총 ${posts.length}건`,
    "",
  ];

  posts.forEach((post, index) => {
    const publicLabel = post.isAnonymous ? "익명" : post.publicAuthorName || "실명";
    const groupSuffix = showGroupColumn
      ? ` | ${formatShortGroupLabel(post.authorGroupName)}`
      : "";

    lines.push(
      `[${index + 1}] ${formatKoreaDateTimeFromUtc(post.createdAt)}`,
      `공개: ${publicLabel} | 작성자: ${post.authorRealName}${groupSuffix}`,
      post.content,
      "",
    );
  });

  return lines.join("\n").trimEnd();
}

function buildCsvContent(
  posts: CompanyInquiryAdminPost[],
  showGroupColumn: boolean,
): string {
  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const header = [
    "번호",
    "작성일시",
    "공개표시",
    "작성자(관리자)",
    ...(showGroupColumn ? ["과정"] : []),
    "내용",
  ].join(",");

  const rows = posts.map((post, index) => {
    const publicLabel = post.isAnonymous ? "익명" : post.publicAuthorName || "실명";
    return [
      String(index + 1),
      formatKoreaDateTimeFromUtc(post.createdAt),
      publicLabel,
      post.authorRealName,
      ...(showGroupColumn
        ? [formatShortGroupLabel(post.authorGroupName)]
        : []),
      post.content.replace(/\r?\n/g, " "),
    ]
      .map(escapeCsv)
      .join(",");
  });

  return `\uFEFF${header}\n${rows.join("\n")}`;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CompanyInquiryAggregatePanel({
  posts,
  totalPostCount,
  selectedGroup,
}: Props) {
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const showGroupColumn = !selectedGroup;

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (visibilityFilter === "anonymous" && !post.isAnonymous) return false;
      if (visibilityFilter === "named" && post.isAnonymous) return false;
      return true;
    });
  }, [posts, visibilityFilter]);

  // 전체 탭일 때 기수별 섹션으로 분리
  const cohortSections = useMemo(() => {
    if (!showGroupColumn) return null;
    return groupAdminPostsByCohort(filteredPosts);
  }, [filteredPosts, showGroupColumn]);

  const stats = useMemo(() => {
    const anonymousCount = posts.filter((post) => post.isAnonymous).length;
    return {
      total: posts.length,
      anonymous: anonymousCount,
      named: posts.length - anonymousCount,
    };
  }, [posts]);

  const selectedGroupLabel = selectedGroup
    ? formatShortGroupLabel(selectedGroup)
    : "전체";

  const handleCopyAll = async () => {
    if (filteredPosts.length === 0) {
      setCopyMessage("복사할 글이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildAggregatedText(filteredPosts, showGroupColumn),
      );
      setCopyMessage(`${filteredPosts.length}건을 클립보드에 복사했습니다.`);
    } catch (error) {
      console.error("기업(문의) 취합 복사 실패:", error);
      setCopyMessage("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  const handleDownloadTxt = () => {
    if (filteredPosts.length === 0) return;
    const dateLabel = new Date().toISOString().slice(0, 10);
    const groupSuffix = selectedGroup
      ? `_${formatShortGroupLabel(selectedGroup)}`
      : "";
    downloadTextFile(
      buildAggregatedText(filteredPosts, showGroupColumn),
      `기업문의_취합${groupSuffix}_${dateLabel}.txt`,
      "text/plain;charset=utf-8",
    );
  };

  const handleDownloadCsv = () => {
    if (filteredPosts.length === 0) return;
    const dateLabel = new Date().toISOString().slice(0, 10);
    const groupSuffix = selectedGroup
      ? `_${formatShortGroupLabel(selectedGroup)}`
      : "";
    downloadTextFile(
      buildCsvContent(filteredPosts, showGroupColumn),
      `기업문의_취합${groupSuffix}_${dateLabel}.csv`,
      "text/csv;charset=utf-8",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="size-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              기업(문의) 취합
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {selectedGroupLabel}
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            전체 탭은 기수별로 나눠 표시됩니다. 익명 글도 관리자 화면에서는
            실제 작성자를 확인할 수 있습니다.
          </p>
          <Link
            href="/company-inquiry"
            className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            회원용 게시판 보기 →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            disabled={filteredPosts.length === 0}
          >
            <Copy className="size-4" aria-hidden />
            전체 복사
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTxt}
            disabled={filteredPosts.length === 0}
          >
            <FileText className="size-4" aria-hidden />
            TXT
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={filteredPosts.length === 0}
          >
            <Download className="size-4" aria-hidden />
            CSV
          </Button>
        </div>
      </div>

      {copyMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{copyMessage}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatBox label="이 탭" value={stats.total} />
        <StatBox label="익명" value={stats.anonymous} />
        <StatBox label="실명" value={stats.named} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "전체" },
            { key: "anonymous", label: "익명만" },
            { key: "named", label: "실명만" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setVisibilityFilter(item.key)}
            className={[
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              visibilityFilter === item.key
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {posts.length === 0
              ? `${selectedGroupLabel} 탭에 등록된 글이 없습니다.`
              : "선택한 조건에 맞는 글이 없습니다."}
          </p>
        </div>
      ) : cohortSections ? (
        <div className="space-y-6">
          {cohortSections.map((section) => (
            <div
              key={section.groupKey}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {section.shortLabel}
                  {section.groupName &&
                  section.shortLabel !== section.groupName ? (
                    <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {section.groupName}
                    </span>
                  ) : null}
                </h2>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {section.posts.length}건
                </span>
              </div>
              <InquiryPostsTable posts={section.posts} showGroupColumn={false} />
            </div>
          ))}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            표시 {filteredPosts.length}건 / 이 탭 {posts.length}건 / 전체{" "}
            {totalPostCount}건 · {cohortSections.length}개 기수
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <InquiryPostsTable posts={filteredPosts} showGroupColumn={false} />
          <div className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            표시 {filteredPosts.length}건 / 이 탭 {posts.length}건 / 전체{" "}
            {totalPostCount}건
          </div>
        </div>
      )}
    </div>
  );
}

function InquiryPostsTable({
  posts,
  showGroupColumn,
}: {
  posts: CompanyInquiryAdminPost[];
  showGroupColumn: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900/60">
            <th className="w-12 px-4 py-3 font-semibold">#</th>
            <th className="w-40 px-4 py-3 font-semibold">작성일시</th>
            <th className="w-24 px-4 py-3 font-semibold">공개</th>
            <th className="w-28 px-4 py-3 font-semibold">작성자</th>
            {showGroupColumn ? (
              <th className="w-16 px-4 py-3 font-semibold">과정</th>
            ) : null}
            <th className="px-4 py-3 font-semibold">내용</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {posts.map((post, index) => {
            const publicLabel = post.isAnonymous
              ? "익명"
              : post.publicAuthorName || "실명";

            return (
              <tr
                key={post.id}
                className="align-top hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40"
              >
                <td className="px-4 py-3 text-zinc-500">{index + 1}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatKoreaDateTimeFromUtc(post.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      post.isAnonymous
                        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                    ].join(" ")}
                  >
                    {publicLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/user/${post.authorId}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {post.authorRealName}
                  </Link>
                </td>
                {showGroupColumn ? (
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatShortGroupLabel(post.authorGroupName)}
                  </td>
                ) : null}
                <td className="whitespace-pre-wrap px-4 py-3 text-zinc-800 dark:text-zinc-200">
                  {post.content}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-black dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
