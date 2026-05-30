import type { ProfileCollectedHonorBadge } from "@/lib/honor-badges";

type LearningStatusCollectedBadgesProps = {
  badges: ProfileCollectedHonorBadge[];
};

/** 학습현황 — 내가 모은 배지 섹션 */
export default function LearningStatusCollectedBadges({
  badges,
}: LearningStatusCollectedBadgesProps) {
  const badgesBySection = groupBadgesBySection(badges);

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-5">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        내가 모은 배지
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        과정에서 받은 명예 배지입니다.
      </p>

      {badges.length > 0 ? (
        <div className="mt-4 space-y-4">
          {badgesBySection.map((section) => (
            <div key={section.key}>
              {section.title ? (
                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {section.title}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {section.badges.map((badge) => (
                  <span
                    key={`${section.key}-${badge.label}`}
                    className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          아직 받은 배지가 없습니다.
        </p>
      )}
    </section>
  );
}

function groupBadgesBySection(badges: ProfileCollectedHonorBadge[]) {
  const sectionMap = new Map<
    string,
    {
      key: string;
      title: string | null;
      sectionSortOrder: number;
      badges: ProfileCollectedHonorBadge[];
    }
  >();

  for (const badge of badges) {
    const sectionKey = badge.sectionTitle ?? "__default__";
    const existing = sectionMap.get(sectionKey);

    if (existing) {
      existing.badges.push(badge);
      continue;
    }

    sectionMap.set(sectionKey, {
      key: sectionKey,
      title: badge.sectionTitle,
      sectionSortOrder: badge.sectionSortOrder,
      badges: [badge],
    });
  }

  return [...sectionMap.values()].toSorted(
    (sectionA, sectionB) =>
      sectionA.sectionSortOrder - sectionB.sectionSortOrder,
  );
}
