import type { ProjectEvaluationItem } from "@/lib/evaluation/fetch-cohort-final-evaluation-data";

/** 프로젝트 표 셀 표시 방식 */
export type ProjectTableCellMode = "score" | "topic" | "text";

/** 팀 프로젝트 주제 칸: 프로젝트 제목만 */
export function formatTeamProjectTopicCellText(item: ProjectEvaluationItem): string {
  return item.title.trim();
}

/** 프로젝트 표 1열 (가로 배치용) */
export type ProjectTableColumn = {
  key: string;
  dateLabel: string;
  headerTitle: string;
  headerSubtitle: string;
  cellMode: ProjectTableCellMode;
  /** cellMode === "score" */
  score: number | null;
  /** cellMode === "topic" */
  topicText: string;
  /** cellMode === "text" (업무 분장·조장/조원 등) */
  textValue: string;
  isTotalColumn: boolean;
  isGrandTotal: boolean;
};

/** 항목·세부항목을 가로 열로 펼침 */
export function buildProjectTableColumns(
  items: ProjectEvaluationItem[],
  grandTotal: number,
): ProjectTableColumn[] {
  const columns: ProjectTableColumn[] = [];

  for (const item of items) {
    if (item.details.length === 0) {
      columns.push({
        key: item.key,
        dateLabel: item.dateLabel,
        headerTitle: item.title,
        headerSubtitle: "합계",
        cellMode: "score",
        score: item.totalScore,
        topicText: "",
        textValue: "",
        isTotalColumn: true,
        isGrandTotal: false,
      });
      continue;
    }

    columns.push({
      key: `${item.key}-project-info`,
      dateLabel: item.dateLabel,
      headerTitle: "주제",
      headerSubtitle: "",
      cellMode: "topic",
      score: null,
      topicText: formatTeamProjectTopicCellText(item),
      textValue: "",
      isTotalColumn: true,
      isGrandTotal: false,
    });

    columns.push({
      key: `${item.key}-work-assignment`,
      dateLabel: "",
      headerTitle: "업무분장",
      headerSubtitle: "",
      cellMode: "text",
      score: null,
      topicText: "",
      textValue: item.workAssignment?.trim() || "—",
      isTotalColumn: false,
      isGrandTotal: false,
    });

    for (const detail of item.details) {
      columns.push({
        key: `${item.key}-${detail.key}`,
        dateLabel: "",
        headerTitle: detail.label,
        headerSubtitle: `/${detail.maxScore}`,
        cellMode: "score",
        score: detail.score,
        topicText: "",
        textValue: "",
        isTotalColumn: false,
        isGrandTotal: false,
      });
    }
  }

  if (columns.length > 0) {
    columns.push({
      key: "grand-total",
      dateLabel: "",
      headerTitle: "전체",
      headerSubtitle: "합계",
      cellMode: "score",
      score: grandTotal,
      topicText: "",
      textValue: "",
      isTotalColumn: true,
      isGrandTotal: true,
    });
  }

  return columns;
}
