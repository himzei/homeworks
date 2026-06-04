import type { DatedScoreItem } from "@/lib/evaluation/fetch-cohort-final-evaluation-data";

/** 기초과정·과제 평가 가로 표 고정 칸 수 */
export const DATED_EVALUATION_SLOT_COUNT = 12;

export type DatedScoreTableSlot = DatedScoreItem & {
  /** 빈 칸(패딩)이면 true */
  isEmpty: boolean;
};

/** 평가 항목을 고정 칸 수로 맞춤. 초과분은 잘라 내고, 부족분은 빈 칸으로 채움 */
export function padDatedScoreItemsToSlots(
  items: DatedScoreItem[],
  slotCount: number = DATED_EVALUATION_SLOT_COUNT,
): DatedScoreTableSlot[] {
  const filledSlots: DatedScoreTableSlot[] = items.slice(0, slotCount).map((item) => ({
    ...item,
    isEmpty: false,
  }));

  while (filledSlots.length < slotCount) {
    const index = filledSlots.length;
    filledSlots.push({
      key: `empty-slot-${index}`,
      dateLabel: "",
      title: "",
      score: 0,
      isEmpty: true,
    });
  }

  return filledSlots;
}
