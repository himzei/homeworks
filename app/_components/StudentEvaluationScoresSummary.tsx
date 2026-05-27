import type { StudentEvaluationSummary } from "@/lib/evaluation/fetch-student-evaluation-summary";

type Props = {
  summary: StudentEvaluationSummary | null;
  isLoading: boolean;
  loadError: string | null;
};

function ScoreCard({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2 text-center">
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-black dark:text-zinc-50">
        {score}
      </p>
      {detail ? (
        <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/** 상담 모달 — 시험·프로젝트·과제 점수 요약 */
export default function StudentEvaluationScoresSummary({
  summary,
  isLoading,
  loadError,
}: Props) {
  return (
    <section
      className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-3"
      aria-label="성적 요약"
    >
      <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
        성적 요약
      </h3>

      {isLoading ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">점수 불러오는 중...</p>
      ) : loadError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{loadError}</p>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ScoreCard
            label="시험점수"
            score={summary.examScore}
            detail={
              summary.examFieldCount > 0
                ? `${summary.examFieldCount}개 항목 합계`
                : "시험 항목 없음"
            }
          />
          <ScoreCard
            label="프로젝트점수"
            score={summary.projectScore}
            detail={
              summary.projectFieldCount > 0
                ? `${summary.projectFieldCount}개 항목 합계`
                : "프로젝트 항목 없음"
            }
          />
          <ScoreCard
            label="과제점수"
            score={summary.homeworkScore}
            detail={
              summary.homeworkAssignmentCount > 0
                ? `${summary.homeworkAssignmentCount}개 과제 합계`
                : "과제 없음"
            }
          />
        </div>
      ) : (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          점수 정보를 표시할 수 없습니다.
        </p>
      )}

      <p className="mt-2 text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
        제출물 평가 화면과 동일한 기준입니다. 과제는 승인·모범답안 등 상태별
        점수(0·7·10·13)의 합이며, 시험·프로젝트는 추가 평가 필드 점수의 합입니다.
      </p>
    </section>
  );
}
