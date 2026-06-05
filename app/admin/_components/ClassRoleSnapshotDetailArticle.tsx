"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  Download,
  Eye,
  Loader2,
} from "lucide-react";

import TeamAttachmentPreviewModal from "@/app/admin/_components/TeamAttachmentPreviewModal";
import { Button } from "@/app/_components/ui/button";
import type { ClassOfficerRole } from "@/lib/class-officers";
import {
  teamProjectHasContent,
  type TeamProjectInfo,
} from "@/lib/class-role-team-projects";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import { downloadAdminTeamAttachment } from "@/lib/team-attachment-utils";
import { cn } from "@/lib/utils";

import ClassOfficerBadge from "./ClassOfficerBadge";

const feedbackCardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** h-32(8rem) — 이 높이를 넘으면 접기·펼치기 표시 */
const TEAM_CARD_COLLAPSE_MAX_HEIGHT_PX = 128;

type ClassRoleTeamCardProps = {
  team: ClassRoleSnapshotTeam;
  cohortLabel: string;
  projectFilled: boolean;
  isDownloadingAttachment: boolean;
  onOpenEdit: () => void;
  onPreviewAttachment: (
    event: React.MouseEvent,
    teamNumber: number,
    fileName: string,
  ) => void;
  onDownloadAttachment: (
    event: React.MouseEvent,
    teamNumber: number,
    fileName: string | null,
  ) => void;
};

/** 조 편성 카드 — 내용이 h-32를 넘으면 기본 접힘, 펼치기로 전체 표시 */
function ClassRoleTeamCard({
  team,
  cohortLabel,
  projectFilled,
  isDownloadingAttachment,
  onOpenEdit,
  onPreviewAttachment,
  onDownloadAttachment,
}: ClassRoleTeamCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  const measureContentHeight = useCallback(() => {
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }
    setNeedsCollapse(
      contentElement.scrollHeight > TEAM_CARD_COLLAPSE_MAX_HEIGHT_PX,
    );
  }, []);

  useLayoutEffect(() => {
    measureContentHeight();
    const contentElement = contentRef.current;
    if (!contentElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(measureContentHeight);
    resizeObserver.observe(contentElement);
    return () => resizeObserver.disconnect();
  }, [measureContentHeight, team]);

  const isCollapsed = needsCollapse && !isExpanded;

  return (
    <li>
      <div
        className={cn(
          "flex min-h-32 w-full flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm transition-colors",
          "hover:border-blue-300 hover:bg-blue-50/40 dark:hover:border-blue-800 dark:hover:bg-blue-950/20",
        )}
      >
        {/* 한글 주석: 내부에 미리보기·다운로드 button이 있어 <button> 래퍼는 hydration 오류 발생 */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpenEdit();
            }
          }}
          className={cn(
            "flex w-full flex-col px-3 pt-3 text-left space-y-2.5 cursor-pointer",
            needsCollapse ? "pb-1" : "pb-3",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset rounded-lg",
          )}
        >
          <div className="flex items-start justify-between gap-2 shrink-0">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">
              {cohortLabel} {team.teamNumber}조
            </p>
            <span className="text-[10px] text-zinc-400 shrink-0">
              {projectFilled ? "정보 입력됨" : "클릭하여 입력"}
            </span>
          </div>

          <div className="relative min-h-0">
            <div
              ref={contentRef}
              className={cn(
                "space-y-2.5",
                isCollapsed && "max-h-32 overflow-hidden",
              )}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-900 dark:text-zinc-100">
                {team.leaderName ? (
                  <span className="relative inline-flex shrink-0 items-center">
                    {/* 한글 주석: 배지는 이름을 기준으로 absolute(요구사항) */}
                    <span className="pt-4 font-bold text-violet-700 dark:text-violet-300">
                      {team.leaderName}
                    </span>
                    <span className="absolute left-1/2 top-0 z-10 w-max max-w-none -translate-x-1/2 whitespace-nowrap">
                      <ClassOfficerBadge
                        classOfficerRole={team.leaderRole}
                        teamNumber={team.teamNumber}
                        isTeamLeader={team.leaderIsTeamLeader}
                        honorBadgeLabels={team.leaderHonorBadgeLabels}
                        showTeamBadges={false}
                      />
                    </span>
                  </span>
                ) : null}
                {team.members.map((member) => (
                  <span
                    key={`${team.teamNumber}-${member.name}`}
                    className="relative inline-flex shrink-0 items-center"
                  >
                    {/* 한글 주석: 배지는 이름을 기준으로 absolute(요구사항) */}
                    <span className="pt-4">{member.name}</span>
                    <span className="absolute left-1/2 top-0 z-10 w-max max-w-none -translate-x-1/2 whitespace-nowrap">
                      <ClassOfficerBadge
                        classOfficerRole={member.classOfficerRole}
                        teamNumber={member.teamNumber}
                        honorBadgeLabels={member.honorBadgeLabels}
                        showTeamBadges={false}
                      />
                    </span>
                  </span>
                ))}
                {!team.leaderName && team.members.length === 0 ? (
                  <span className="text-zinc-400">미지정</span>
                ) : null}
              </p>

              {projectFilled && team.teamProject ? (
                <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                  {team.teamProject.topic.trim() ||
                  team.teamProject.pptStoragePath ? (
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      {team.teamProject.topic.trim() ? (
                        <p className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">
                          {team.teamProject.topic}
                        </p>
                      ) : (
                        <span className="flex-1" aria-hidden />
                      )}
                      {team.teamProject.pptStoragePath ? (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            title={
                              team.teamProject.pptFileName ?? "첨부파일 미리보기"
                            }
                            aria-label={`첨부파일 미리보기: ${team.teamProject.pptFileName ?? "파일"}`}
                            onClick={(event) =>
                              onPreviewAttachment(
                                event,
                                team.teamNumber,
                                team.teamProject?.pptFileName ?? "첨부파일",
                              )
                            }
                            className="cursor-pointer rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            type="button"
                            title={
                              team.teamProject.pptFileName ?? "첨부파일 다운로드"
                            }
                            aria-label={`첨부파일 다운로드: ${team.teamProject.pptFileName ?? "파일"}`}
                            disabled={isDownloadingAttachment}
                            onClick={(event) =>
                              onDownloadAttachment(
                                event,
                                team.teamNumber,
                                team.teamProject?.pptFileName ?? null,
                              )
                            }
                            className="cursor-pointer rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400 disabled:opacity-50"
                          >
                            {isDownloadingAttachment ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Download className="size-4" />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {team.teamProject.feedbackComments.length > 0 ? (
                    <ul className="space-y-1.5">
                      {team.teamProject.feedbackComments.map((comment) => (
                        <li
                          key={comment.id}
                          className="rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-400">
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              {comment.authorName}
                            </span>
                            <time dateTime={comment.createdAt}>
                              {feedbackCardDateFormatter.format(
                                new Date(comment.createdAt),
                              )}
                            </time>
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap wrap-break-word">
                            {comment.content}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {team.teamProject.githubUrl.trim() ? (
                    <p className="truncate">
                      <span className="font-medium text-zinc-500">GitHub</span>{" "}
                      {team.teamProject.githubUrl}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {isCollapsed ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-white to-transparent dark:from-zinc-950"
                aria-hidden
              />
            ) : null}
          </div>
        </div>

        {needsCollapse ? (
          <button
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
            className={cn(
              "flex w-full items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer",
              "hover:bg-blue-50/60 dark:hover:bg-blue-950/30 rounded-b-lg border-t border-zinc-100 dark:border-zinc-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
            )}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-3.5" aria-hidden />
                접기
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" aria-hidden />
                펼치기
              </>
            )}
          </button>
        ) : null}
      </div>
    </li>
  );
}

/** 조원 한 명 (상세·이미지용) */
export type ClassRoleSnapshotTeamMember = {
  name: string;
  classOfficerRole: ClassOfficerRole | null;
  teamNumber: number;
  honorBadgeLabels?: string[];
};

/** 조별 편성 (상세·이미지용) */
export type ClassRoleSnapshotTeam = {
  teamNumber: number;
  leaderName: string | null;
  leaderRole: ClassOfficerRole | null;
  /** 반장이 조장으로 배치된 경우 */
  leaderIsTeamLeader?: boolean;
  leaderHonorBadgeLabels?: string[];
  members: ClassRoleSnapshotTeamMember[];
  teamProject?: TeamProjectInfo | null;
};

type ClassRoleSnapshotDetailArticleProps = {
  snapshotId: string;
  title: string;
  cohortLabel: string;
  groupName: string;
  createdAtLabel: string;
  createdAtIso: string;
  isActive: boolean;
  teamCount: number;
  teams: ClassRoleSnapshotTeam[];
  initialTeamProjects?: Record<number, TeamProjectInfo>;
};

/**
 * 조 편성 상세 본문 + PNG 다운로드
 */
export default function ClassRoleSnapshotDetailArticle({
  snapshotId,
  title,
  cohortLabel,
  groupName,
  createdAtLabel,
  createdAtIso,
  isActive,
  teamCount,
  teams,
  initialTeamProjects = {},
}: ClassRoleSnapshotDetailArticleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [teamProjects, setTeamProjects] =
    useState<Record<number, TeamProjectInfo>>(initialTeamProjects);
  const [downloadingTeamNumber, setDownloadingTeamNumber] = useState<
    number | null
  >(null);
  const [previewTarget, setPreviewTarget] = useState<{
    teamNumber: number;
    fileName: string;
  } | null>(null);

  const teamsWithProjects: ClassRoleSnapshotTeam[] = teams.map((team) => ({
    ...team,
    teamProject: teamProjects[team.teamNumber] ?? team.teamProject ?? null,
  }));

  // 조장·조원이 모두 비어 있는 조는 표시하지 않음
  const visibleTeams = teamsWithProjects.filter(
    (team) => team.leaderName !== null || team.members.length > 0,
  );
  const visibleTeamCount =
    visibleTeams.length > 0
      ? Math.max(...visibleTeams.map((team) => team.teamNumber))
      : teamCount;

  const buildReturnToHref = useCallback(() => {
    // 한글 주석: 상세 페이지로 되돌아오기 위한 returnTo를 만든다.
    // - searchParams는 ReadonlyURLSearchParams라 그대로 문자열로 복원
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const handleOpenTeamProjectPage = useCallback(
    (teamNumber: number) => {
      // 한글 주석: 모달 대신 조별 프로젝트 편집 페이지로 이동
      const returnTo = buildReturnToHref();
      router.push(
        `/admin/class-roles/${snapshotId}/team-project/${teamNumber}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    },
    [buildReturnToHref, router, snapshotId],
  );

  const handlePreviewAttachment = useCallback(
    (event: React.MouseEvent, teamNumber: number, fileName: string) => {
      event.stopPropagation();
      event.preventDefault();
      setPreviewTarget({ teamNumber, fileName });
    },
    [],
  );

  const handleDownloadAttachment = useCallback(
    async (
      event: React.MouseEvent,
      teamNumber: number,
      fileName: string | null,
    ) => {
      event.stopPropagation();
      event.preventDefault();

      setDownloadingTeamNumber(teamNumber);
      try {
        const downloadError = await downloadAdminTeamAttachment(
          snapshotId,
          teamNumber,
          fileName,
        );
        if (downloadError) {
          window.alert(downloadError);
        }
      } catch {
        window.alert("첨부파일 다운로드 중 오류가 발생했습니다.");
      } finally {
        setDownloadingTeamNumber(null);
      }
    },
    [snapshotId],
  );

  const handleDownloadImage = useCallback(async () => {
    const element = exportRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const dateLabel = new Date(createdAtIso).toISOString().slice(0, 10);
      const safeTitle = sanitizeDownloadFilename(title);
      await downloadElementAsPng(
        element,
        `${safeTitle}_조편성_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  }, [createdAtIso, title]);

  return (
    <article className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {cohortLabel}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  현재 적용
                </span>
              ) : null}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-zinc-50 flex items-center gap-2">
              <Crown
                className="size-6 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              {title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              작성일 <time dateTime={createdAtIso}>{createdAtLabel}</time>
            </p>
            {groupName !== cohortLabel ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {groupName} · {visibleTeamCount}조
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {visibleTeamCount}조
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDownloadImage()}
            disabled={isDownloading}
            data-export-ignore
            className="shrink-0"
          >
            {isDownloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Download className="size-4" />
                이미지 다운로드
              </>
            )}
          </Button>
        </div>
      </header>

      {/* PNG 캡처 영역 */}
      <div
        ref={exportRef}
        className="px-4 sm:px-6 py-6 bg-zinc-50 dark:bg-zinc-900/30 space-y-6"
      >
        <div className="text-center">
          <p className="text-base sm:text-lg font-bold text-black dark:text-zinc-50">
            {title}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            {cohortLabel}
            {groupName !== cohortLabel ? ` · ${groupName}` : ""} · 작성일{" "}
            {createdAtLabel}
          </p>
        </div>

        <section>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            조 편성 ({visibleTeamCount}조)
          </h3>
          <ul
            className={cn(
              "grid items-start gap-3",
              visibleTeamCount >= 4
                ? "sm:grid-cols-2 xl:grid-cols-3"
                : visibleTeamCount >= 2
                  ? "sm:grid-cols-2"
                  : "grid-cols-1",
            )}
          >
            {visibleTeams.map((team) => {
              const projectFilled = teamProjectHasContent(
                team.teamProject ?? {
                  topic: "",
                  feedbackComments: [],
                  githubUrl: "",
                  pptStoragePath: null,
                  pptFileName: null,
                  // 한글 주석: 팀 프로젝트 정보의 evaluations 필드는 필수라 기본값을 넣어준다.
                  evaluations: {},
                },
              );

              return (
                <ClassRoleTeamCard
                  key={team.teamNumber}
                  team={team}
                  cohortLabel={cohortLabel}
                  projectFilled={projectFilled}
                  isDownloadingAttachment={
                    downloadingTeamNumber === team.teamNumber
                  }
                  onOpenEdit={() => handleOpenTeamProjectPage(team.teamNumber)}
                  onPreviewAttachment={(event, teamNumber, attachmentFileName) =>
                    handlePreviewAttachment(event, teamNumber, attachmentFileName)
                  }
                  onDownloadAttachment={(event, teamNumber, attachmentFileName) =>
                    void handleDownloadAttachment(event, teamNumber, attachmentFileName)
                  }
                />
              );
            })}
          </ul>
        </section>
      </div>

      {previewTarget ? (
        <TeamAttachmentPreviewModal
          isOpen
          snapshotId={snapshotId}
          teamNumber={previewTarget.teamNumber}
          fileName={previewTarget.fileName}
          onClose={() => setPreviewTarget(null)}
        />
      ) : null}
    </article>
  );
}
