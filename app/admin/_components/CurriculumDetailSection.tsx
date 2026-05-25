import type { CurriculumItem } from "@/lib/course-schedule";

type CurriculumDetailSectionProps = {
  title: string;
  periodLabel: string | null;
  items: CurriculumItem[];
  /** 통합 커리큘럼 블록 안 하위 구역 */
  asSubsection?: boolean;
};

/**
 * 상세보기 — 커리큘럼 항목 목록 (읽기 전용)
 */
export default function CurriculumDetailSection({
  title,
  periodLabel,
  items,
  asSubsection = false,
}: CurriculumDetailSectionProps) {
  const Wrapper = asSubsection ? "div" : "section";
  const HeadingTag = asSubsection ? "h3" : "h2";

  return (
    <Wrapper className="space-y-3">
      <div>
        <HeadingTag
          className={
            asSubsection
              ? "text-base font-semibold text-black dark:text-zinc-50"
              : "text-lg font-semibold text-black dark:text-zinc-50"
          }
        >
          {title}
        </HeadingTag>
        {periodLabel ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            기간: {periodLabel}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            교육 기간이 설정되지 않았습니다.
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-5 text-center">
          등록된 커리큘럼 항목이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="px-3 py-2 w-12">순서</th>
                <th className="px-3 py-2">커리큘럼</th>
                <th className="px-3 py-2 w-28">강사</th>
                <th className="px-3 py-2 w-20 text-center">강의일수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                >
                  <td className="px-3 py-2.5 text-zinc-500">{index + 1}</td>
                  <td className="px-3 py-2.5 font-medium">
                    {item.curriculum || "—"}
                  </td>
                  <td className="px-3 py-2.5">{item.instructor || "—"}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums">
                    {item.lectureDays.trim() || "1"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Wrapper>
  );
}
