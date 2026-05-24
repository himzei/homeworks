"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Crown, Download, Loader2 } from "lucide-react";

import { Button } from "@/app/_components/ui/button";
import {
  CLASS_OFFICER_ROLE,
  type ClassOfficerRole,
} from "@/lib/class-officers";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import { cn } from "@/lib/utils";

import ClassOfficerBadge from "./ClassOfficerBadge";

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
};

type ClassRoleSnapshotDetailArticleProps = {
  title: string;
  cohortLabel: string;
  groupName: string;
  createdAtLabel: string;
  createdAtIso: string;
  isActive: boolean;
  presidentName: string | null;
  presidentHonorBadgeLabels?: string[];
  teamCount: number;
  teams: ClassRoleSnapshotTeam[];
};

/**
 * 조 편성 상세 본문 + PNG 다운로드
 */
export default function ClassRoleSnapshotDetailArticle({
  title,
  cohortLabel,
  groupName,
  createdAtLabel,
  createdAtIso,
  isActive,
  presidentName,
  presidentHonorBadgeLabels = [],
  teamCount,
  teams,
}: ClassRoleSnapshotDetailArticleProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
                {groupName} · {teamCount}조
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {teamCount}조
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

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2">
            <Crown
              className="size-4 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            반장
          </h3>
          {presidentName ? (
            <p className="text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {presidentName}
              <ClassOfficerBadge
                classOfficerRole={CLASS_OFFICER_ROLE.CLASS_PRESIDENT}
                teamNumber={null}
                honorBadgeLabels={presidentHonorBadgeLabels}
                showTeamBadges={false}
              />
            </p>
          ) : (
            <p className="text-sm text-zinc-500">미지정</p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            조 편성 ({teamCount}조)
          </h3>
          <ul
            className={cn(
              "grid gap-3",
              teamCount >= 4
                ? "sm:grid-cols-2 xl:grid-cols-3"
                : teamCount >= 2
                  ? "sm:grid-cols-2"
                  : "grid-cols-1",
            )}
          >
            {teams.map((team) => (
              <li
                key={team.teamNumber}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-3 space-y-2.5 text-sm"
              >
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  {cohortLabel} {team.teamNumber}조
                </p>
                <div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    조장
                  </span>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    {team.leaderName ?? (
                      <span className="text-zinc-400">미지정</span>
                    )}
                    {team.leaderName ? (
                      <ClassOfficerBadge
                        classOfficerRole={team.leaderRole}
                        teamNumber={team.teamNumber}
                        isTeamLeader={team.leaderIsTeamLeader}
                        honorBadgeLabels={team.leaderHonorBadgeLabels}
                        showTeamBadges={false}
                      />
                    ) : null}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    조원
                  </span>
                  {team.members.length === 0 ? (
                    <p className="mt-0.5 text-zinc-400">없음</p>
                  ) : (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {team.members.map((member) => (
                        <li
                          key={`${team.teamNumber}-${member.name}`}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-50 dark:bg-zinc-900 px-2 py-1"
                        >
                          <span>{member.name}</span>
                          <ClassOfficerBadge
                            classOfficerRole={member.classOfficerRole}
                            teamNumber={member.teamNumber}
                            honorBadgeLabels={member.honorBadgeLabels}
                            showTeamBadges={false}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
