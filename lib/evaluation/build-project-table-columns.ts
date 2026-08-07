import type { ProjectEvaluationItem } from "@/lib/evaluation/fetch-cohort-final-evaluation-data";

/** 프로젝트 표 셀 표시 방식 — 점수 열만 (정보는 표 밖 2행) */
export type ProjectTableCellMode = "score";

/** 팀 프로젝트 주제 칸: 프로젝트 제목만 */
export function formatTeamProjectTopicCellText(item: ProjectEvaluationItem): string {
  return item.title.trim();
}

/** 외부 URL — http(s) 없으면 https:// 붙임 */
export function normalizeProjectExternalUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 프로젝트 정보 블록(표 위 2행) */
export type ProjectTableInfoContent = {
  key: string;
  dateLabel: string;
  topic: string;
  workAssignment: string;
  githubUrl: string;
  deployUrl: string;
};

/** 프로젝트 표 1열 (점수·합계만) */
export type ProjectTableColumn = {
  key: string;
  dateLabel: string;
  headerTitle: string;
  headerSubtitle: string;
  cellMode: ProjectTableCellMode;
  score: number | null;
  /** 하위 호환 — 정보는 infoBlocks로 분리 */
  info: null;
  textValue: string;
  isTotalColumn: boolean;
  isGrandTotal: boolean;
};

/** 표 위에 둘 프로젝트 정보 블록 목록 */
export function buildProjectInfoBlocks(
  items: ProjectEvaluationItem[],
): ProjectTableInfoContent[] {
  return items.map((item) => {
    const dateLabel =
      item.dateLabel.trim() && item.dateLabel.trim() !== "날짜미정"
        ? item.dateLabel.trim()
        : "";

    return {
      key: item.key,
      dateLabel,
      topic: formatTeamProjectTopicCellText(item) || "—",
      workAssignment: item.workAssignment?.trim() || "—",
      githubUrl: item.githubUrl?.trim() || "",
      deployUrl: item.deployUrl?.trim() || "",
    };
  });
}

/**
 * 세부 점수·합계 열만 생성
 * - 주제·업무분장·URL은 buildProjectInfoBlocks 사용
 */
export function buildProjectTableColumns(
  items: ProjectEvaluationItem[],
  grandTotal: number,
): ProjectTableColumn[] {
  const columns: ProjectTableColumn[] = [];
  const detailItems = items.filter((item) => item.details.length > 0);

  for (const item of detailItems) {
    for (const detail of item.details) {
      columns.push({
        key: `${item.key}-${detail.key}`,
        dateLabel: "",
        headerTitle: detail.label,
        headerSubtitle: "",
        cellMode: "score",
        score: detail.score,
        info: null,
        textValue: "",
        isTotalColumn: false,
        isGrandTotal: false,
      });
    }
  }

  // 한글 주석: 추가 필드만 있고 세부점수가 없으면 항목별 점수 열
  for (const item of items) {
    if (item.details.length > 0) continue;
    const dateLabel =
      item.dateLabel.trim() && item.dateLabel.trim() !== "날짜미정"
        ? item.dateLabel.trim()
        : "";
    columns.push({
      key: item.key,
      dateLabel,
      headerTitle: item.title,
      headerSubtitle: "",
      cellMode: "score",
      score: item.totalScore,
      info: null,
      textValue: "",
      isTotalColumn: true,
      isGrandTotal: false,
    });
  }

  if (columns.length > 0 || items.length > 0) {
    columns.push({
      key: "grand-total",
      dateLabel: "",
      headerTitle: "합계",
      headerSubtitle: "",
      cellMode: "score",
      score: grandTotal,
      info: null,
      textValue: "",
      isTotalColumn: true,
      isGrandTotal: true,
    });
  }

  return columns;
}
