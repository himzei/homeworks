"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import {
  PEER_EVALUATION_STATUS_LABEL,
  type PeerEvaluationStatus,
} from "@/lib/peer-evaluation/constants";
import type { PeerEvaluationProject } from "@/lib/peer-evaluation/types";

type Props = {
  projects: PeerEvaluationProject[];
  cohortLabel: string;
};

/**
 * 학생용 동료평가 목록 — 받은 점수/타인 점수는 절대 표시하지 않음
 */
export default function PeerEvaluationStudentBoard({
  projects,
  cohortLabel,
}: Props) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          동료평가
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {cohortLabel}
          </span>{" "}
          과정의 동료를 평가합니다. 내가 준 점수만 확인할 수 있으며,{" "}
          <span className="font-medium">누가 몇 점을 받았는지는 볼 수 없습니다.</span>
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <ClipboardList className="mx-auto size-10 text-zinc-300 dark:text-zinc-600" />
          <p className="mt-4 text-sm text-zinc-500">
            진행 중이거나 종료된 동료평가가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {projects.map((project) => {
            const canEvaluate = project.status === "open";
            return (
              <li key={project.id}>
                <Link
                  href={`/peer-evaluation/${project.id}`}
                  className="flex items-center justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 sm:px-5 dark:bg-zinc-950 dark:hover:bg-zinc-900/50"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {project.title}
                      </span>
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          project.status === "open"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                        ].join(" ")}
                      >
                        {
                          PEER_EVALUATION_STATUS_LABEL[
                            project.status as PeerEvaluationStatus
                          ]
                        }
                      </span>
                    </div>
                    {project.description ? (
                      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {project.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400">
                    {canEvaluate ? "평가하기" : "내 제출 보기"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
