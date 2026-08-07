import Link from "next/link";
import { BarChart3, ClipboardList, PencilLine } from "lucide-react";

import {
  formatShortGroupLabel,
  parseCohortNumberFromGroupName,
} from "@/lib/fetch-group-options";
import {
  PEER_EVALUATION_STATUS_LABEL,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import type { PeerEvaluationProject } from "@/lib/peer-evaluation/types";

type Props = {
  projects: PeerEvaluationProject[];
  /** 관리자 본인의 소속 기수 (없으면 null) — 직접 평가 가능한 기수 판별용 */
  viewerGroupName: string | null;
};

type CohortSection = {
  groupName: string;
  shortLabel: string;
  projects: PeerEvaluationProject[];
};

const STATUS_BADGE_CLASS: Record<PeerEvaluationStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  open: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  closed:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
};

/** 프로젝트 목록을 기수별로 묶고 최신 기수 우선으로 정렬 */
function groupProjectsByCohort(
  projects: PeerEvaluationProject[],
): CohortSection[] {
  const sectionByGroupName = new Map<string, CohortSection>();

  for (const project of projects) {
    const existing = sectionByGroupName.get(project.groupName);
    if (existing) {
      existing.projects.push(project);
      continue;
    }
    sectionByGroupName.set(project.groupName, {
      groupName: project.groupName,
      shortLabel: formatShortGroupLabel(project.groupName),
      projects: [project],
    });
  }

  return [...sectionByGroupName.values()].toSorted((sectionA, sectionB) => {
    const cohortA = parseCohortNumberFromGroupName(sectionA.groupName);
    const cohortB = parseCohortNumberFromGroupName(sectionB.groupName);

    if (cohortA !== null && cohortB !== null && cohortB !== cohortA) {
      return cohortB - cohortA;
    }
    if (cohortA !== null && cohortB === null) return -1;
    if (cohortA === null && cohortB !== null) return 1;

    return sectionA.groupName.localeCompare(sectionB.groupName, "ko");
  });
}

/**
 * 관리자용 동료평가 목록 — 모든 기수의 프로젝트를 기수별로 확인
 */
export default function PeerEvaluationAllCohortsBoard({
  projects,
  viewerGroupName,
}: Props) {
  const cohortSections = groupProjectsByCohort(projects);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          동료평가
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          관리자는{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            모든 기수
          </span>
          의 동료평가를 확인할 수 있습니다. 결과 집계는 관리자 화면에서
          열립니다.
        </p>
      </header>

      {cohortSections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <ClipboardList className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-4 text-sm text-zinc-500">
            등록된 동료평가가 없습니다.
          </p>
          <Link
            href="/admin/peer-evaluations"
            className="mt-2 inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400"
          >
            관리자 화면에서 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {cohortSections.map((section) => (
            <section key={section.groupName} className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {section.shortLabel}
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {section.projects.length}개
                </span>
                {section.groupName === viewerGroupName ? (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    내 기수
                  </span>
                ) : null}
              </div>

              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {section.projects.map((project) => {
                  // 본인 기수의 진행중 프로젝트만 직접 평가 가능 (RLS 기준과 동일)
                  const canEvaluate =
                    project.status === "open" &&
                    project.groupName === viewerGroupName;

                  return (
                    <li
                      key={project.id}
                      className="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:bg-zinc-950"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {project.title}
                          </span>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[project.status]}`}
                          >
                            {PEER_EVALUATION_STATUS_LABEL[project.status]}
                          </span>
                        </div>
                        {project.description ? (
                          <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                            {project.description}
                          </p>
                        ) : null}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          평가항목 {project.criteria.length}개 ·{" "}
                          {new Date(project.createdAt).toLocaleDateString(
                            "ko-KR",
                          )}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {canEvaluate ? (
                          <Link
                            href={`/peer-evaluation/${project.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <PencilLine className="size-4" aria-hidden />
                            평가하기
                          </Link>
                        ) : null}
                        <Link
                          href={`/admin/peer-evaluations/${project.id}?group=${encodeURIComponent(project.groupName)}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          <BarChart3 className="size-4" aria-hidden />
                          결과 보기
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
