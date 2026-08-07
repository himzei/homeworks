import { buildProjectTableColumns } from "@/lib/evaluation/build-project-table-columns";
import {
  DATED_EVALUATION_SLOT_COUNT,
  padDatedScoreItemsToSlots,
} from "@/lib/evaluation/dated-score-table-slots";
import type {
  StudentDatedScoreEvaluation,
  StudentFinalEvaluationRow,
  StudentProjectEvaluation,
} from "@/lib/evaluation/fetch-cohort-final-evaluation-data";
import type { StudentPeerEvaluation } from "@/lib/evaluation/fetch-cohort-peer-evaluation-scores";

/** 인쇄/PDF용 학생 1명 데이터 (화면 초안 텍스트 포함) */
export type FinalEvaluationPrintEntry = {
  row: StudentFinalEvaluationRow;
  consultationSummary: string;
  professorFinalEvaluation: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrintDate(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function renderHorizontalScoreTableHtml(
  sectionTitle: string,
  evaluation: StudentDatedScoreEvaluation,
  emptyMessage: string,
  accentClass: string,
  fixedSlotCount?: number,
): string {
  if (evaluation.items.length === 0 && !fixedSlotCount) {
    return `
      <section class="print-section ${accentClass}">
        <h3 class="section-title">${escapeHtml(sectionTitle)}</h3>
        <p class="empty-msg">${escapeHtml(emptyMessage)}</p>
      </section>`;
  }

  const slots = fixedSlotCount
    ? padDatedScoreItemsToSlots(evaluation.items, fixedSlotCount)
    : evaluation.items.map((item) => ({ ...item, isEmpty: false }));

  const headerCells = slots
    .map((slot) => {
      if (slot.isEmpty) {
        return `<th class="score-th score-th-empty">&nbsp;</th>`;
      }
      return `
        <th class="score-th">
          <span class="date-label">${escapeHtml(slot.dateLabel)}</span>
          <span class="item-title">${escapeHtml(slot.title)}</span>
        </th>`;
    })
    .join("");

  const scoreCells = slots
    .map((slot) =>
      slot.isEmpty
        ? `<td class="score-td score-td-empty">&nbsp;</td>`
        : `<td class="score-td tabular">${slot.score}</td>`,
    )
    .join("");

  const colspan = slots.length;

  return `
    <section class="print-section ${accentClass}">
      <div class="section-head">
        <h3 class="section-title">${escapeHtml(sectionTitle)}</h3>
        <span class="section-total tabular">합계 ${evaluation.totalScore}</span>
      </div>
      <table class="score-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody><tr>${scoreCells}</tr></tbody>
        <tfoot>
          <tr>
            <td colspan="${colspan}" class="table-foot">
              합계 <strong class="tabular">${evaluation.totalScore}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>`;
}

function renderProjectTableHtml(project: StudentProjectEvaluation): string {
  const columns = buildProjectTableColumns(project.items, project.totalScore);

  if (columns.length === 0) {
    return `
      <section class="print-section accent-violet">
        <h3 class="section-title">프로젝트 평가</h3>
        <p class="empty-msg">등록된 프로젝트 평가 항목이 없습니다.</p>
      </section>`;
  }

  const headerCells = columns
    .map((column) => {
      const datePart = column.dateLabel
        ? `<span class="date-label">${escapeHtml(column.dateLabel)}</span>`
        : "";
      const subtitlePart = column.headerSubtitle
        ? `<span class="item-sub">${escapeHtml(column.headerSubtitle)}</span>`
        : "";
      return `
        <th class="score-th${column.isGrandTotal ? " grand-total" : ""}">
          ${datePart}
          <span class="item-title">${escapeHtml(column.headerTitle)}</span>
          ${subtitlePart}
        </th>`;
    })
    .join("");

  const scoreCells = columns
    .map((column) => {
      if (column.cellMode === "topic") {
        const topicHtml = escapeHtml(column.topicText).replace(/\n/g, "<br>");
        return `<td class="score-td topic-cell">${topicHtml}</td>`;
      }
      if (column.cellMode === "text") {
        const textHtml = escapeHtml(column.textValue).replace(/\n/g, "<br>");
        return `<td class="score-td text-cell">${textHtml}</td>`;
      }
      return `<td class="score-td tabular${column.isTotalColumn ? " total-col" : ""}${column.isGrandTotal ? " grand-total" : ""}">${column.score ?? ""}</td>`;
    })
    .join("");

  return `
    <section class="print-section accent-violet">
      <div class="section-head">
        <h3 class="section-title">프로젝트 평가</h3>
        <span class="section-total tabular">합계 ${project.totalScore}</span>
      </div>
      <div class="table-wrap">
        <table class="score-table project-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody><tr>${scoreCells}</tr></tbody>
        </table>
      </div>
    </section>`;
}

/** 동료평가 — 프로젝트별 받은 점수 평균 + 평가 인원 */
function renderPeerEvaluationTableHtml(peer: StudentPeerEvaluation): string {
  if (peer.items.length === 0) {
    return `
      <section class="print-section accent-rose">
        <h3 class="section-title">동료평가</h3>
        <p class="empty-msg">진행된 동료평가가 없습니다.</p>
      </section>`;
  }

  const headerCells = peer.items
    .map(
      (item) => `
        <th class="score-th">
          <span class="date-label">${escapeHtml(item.dateLabel)}</span>
          <span class="item-title">${escapeHtml(item.title)}</span>
          <span class="item-sub">평가 ${item.ratingCount}명</span>
        </th>`,
    )
    .join("");

  const scoreCells = peer.items
    .map((item) => {
      const rankLabel =
        item.rank !== null && item.rankedStudentCount > 0
          ? `${item.rank}/${item.rankedStudentCount}위`
          : "";
      return `<td class="score-td tabular">${item.score}${
        rankLabel
          ? ` <span class="item-sub">${escapeHtml(rankLabel)}</span>`
          : ""
      }</td>`;
    })
    .join("");

  const averageLabel = peer.averageScore === null ? "-" : peer.averageScore;
  const overallRankLabel =
    peer.rank !== null && peer.rankedStudentCount > 0
      ? ` · ${peer.rank}/${peer.rankedStudentCount}위`
      : "";

  return `
    <section class="print-section accent-rose">
      <div class="section-head">
        <h3 class="section-title">동료평가</h3>
        <span class="section-total tabular">평균 ${averageLabel}${overallRankLabel} · 받은 평가 ${peer.ratingCount}건</span>
      </div>
      <table class="score-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody><tr>${scoreCells}</tr></tbody>
      </table>
    </section>`;
}

function renderStudentPageHtml(
  groupName: string,
  entry: FinalEvaluationPrintEntry,
): string {
  const { row, consultationSummary, professorFinalEvaluation } = entry;
  const metrics = row.metrics;

  const homeworkForPrint: StudentDatedScoreEvaluation = {
    totalScore: metrics.homework.totalScore,
    items: metrics.homework.items.map((item) => ({
      key: item.assignmentId,
      dateLabel: item.dateLabel,
      title: item.title,
      score: item.score,
    })),
  };

  const summaryLine = [
    `기초 ${metrics.foundation.totalScore}`,
    `시험 ${metrics.exam.totalScore}`,
    `과제 ${metrics.homework.totalScore}`,
    `프로젝트 ${metrics.project.totalScore}`,
    `동료평가 ${metrics.peer.averageScore ?? "-"}`,
  ].join(" · ");

  const consultationBlock = consultationSummary.trim()
    ? `<div class="text-block">${escapeHtml(consultationSummary).replace(/\n/g, "<br>")}</div>`
    : `<p class="empty-msg">작성된 상담 내용이 없습니다.</p>`;

  const professorBlock = professorFinalEvaluation.trim()
    ? `<div class="text-block">${escapeHtml(professorFinalEvaluation).replace(/\n/g, "<br>")}</div>`
    : `<p class="empty-msg">작성된 교수 최종 평가가 없습니다.</p>`;

  return `
    <article class="print-page">
      <header class="page-header">
        <div>
          <p class="doc-label">최종 평가</p>
          <h2 class="student-name">${escapeHtml(row.studentName)}</h2>
        </div>
        <div class="page-meta">
          <p><span class="meta-label">기수</span> ${escapeHtml(groupName)}</p>
          <p><span class="meta-label">출력일</span> ${escapeHtml(formatPrintDate())}</p>
        </div>
      </header>
      <p class="score-summary tabular">${escapeHtml(summaryLine)}</p>

      ${renderHorizontalScoreTableHtml(
        "기초과정 평가",
        metrics.foundation,
        "기초과정 평가 항목이 없습니다.",
        "accent-sky",
        DATED_EVALUATION_SLOT_COUNT,
      )}
      ${renderHorizontalScoreTableHtml(
        "과제 평가",
        homeworkForPrint,
        "본과정 과제 평가 항목이 없습니다.",
        "accent-emerald",
        DATED_EVALUATION_SLOT_COUNT,
      )}
      ${renderHorizontalScoreTableHtml(
        "시험 평가",
        metrics.exam,
        "시험 평가 항목이 없습니다.",
        "accent-amber",
        DATED_EVALUATION_SLOT_COUNT,
      )}
      ${renderProjectTableHtml(metrics.project)}
      ${renderPeerEvaluationTableHtml(metrics.peer)}

      <section class="print-section text-section">
        <h3 class="section-title">상담 내용</h3>
        ${consultationBlock}
      </section>

      <section class="print-section text-section">
        <h3 class="section-title">교수 최종 평가</h3>
        ${professorBlock}
      </section>
    </article>`;
}

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  body {
    padding: 16px;
  }
  .print-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    margin: -16px -16px 16px;
    background: #e8f2ff;
    border-bottom: 1px solid #b8d4f0;
    font-size: 10pt;
  }
  .print-toolbar button {
    padding: 8px 16px;
    font-size: 10pt;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #2563eb;
    border-radius: 6px;
    background: #2563eb;
    color: #fff;
  }
  .print-toolbar button:hover {
    background: #1d4ed8;
  }
  .print-toolbar .hint {
    flex: 1;
    min-width: 200px;
    color: #334155;
    margin: 0;
  }
  .print-page {
    width: 100%;
    max-width: 186mm;
    margin: 0 auto;
    padding: 0;
    page-break-after: always;
    break-after: page;
  }
  .print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
  .doc-label {
    margin: 0 0 2px;
    font-size: 9pt;
    color: #555;
    letter-spacing: 0.02em;
  }
  .student-name {
    margin: 0;
    font-size: 16pt;
    font-weight: 700;
  }
  .page-meta {
    text-align: right;
    font-size: 9pt;
    color: #333;
  }
  .page-meta p { margin: 0 0 2px; }
  .meta-label { color: #666; margin-right: 4px; }
  .score-summary {
    margin: 0 0 10px;
    font-size: 9.5pt;
    color: #444;
  }
  .print-section {
    margin-bottom: 10px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .text-section { break-inside: auto; page-break-inside: auto; }
  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }
  .section-title {
    margin: 0;
    font-size: 10.5pt;
    font-weight: 700;
  }
  .section-total {
    font-size: 9.5pt;
    font-weight: 600;
  }
  .empty-msg {
    margin: 0;
    font-size: 9pt;
    color: #666;
    font-style: italic;
  }
  .score-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    table-layout: auto;
  }
  .table-wrap { overflow-x: auto; width: 100%; }
  .project-table {
    width: 100%;
    font-size: 7.5pt;
  }
  .score-th, .score-td {
    border: 1px solid #ccc;
    padding: 4px 5px;
    text-align: center;
    vertical-align: middle;
  }
  .score-th {
    background: #f5f5f5;
    font-weight: 600;
    min-width: 2.5rem;
  }
  .score-th-empty,
  .score-td-empty {
    background: #fafafa;
  }
  .score-th.grand-total, .score-td.grand-total {
    width: 24mm;
    min-width: 24mm;
    max-width: 24mm;
    background: #eee;
    font-weight: 700;
  }
  .score-td.total-col { font-weight: 600; }
  .score-td.topic-cell {
    min-width: 28mm;
    max-width: 55mm;
    text-align: center;
    font-size: 7.5pt;
    font-weight: 400;
    line-height: 1.35;
    white-space: normal;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
  .score-td.role-cell,
  .score-td.text-cell {
    min-width: 14mm;
    max-width: 32mm;
    text-align: center;
    font-size: 7.5pt;
    font-weight: 400;
    line-height: 1.35;
    white-space: normal;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
  .date-label {
    display: block;
    font-size: 7.5pt;
    font-weight: 500;
    color: #555;
    margin-bottom: 1px;
  }
  .item-title { display: block; font-size: 8pt; }
  .item-sub { display: block; font-size: 7pt; color: #666; font-weight: 400; }
  .table-foot {
    text-align: right;
    font-size: 8.5pt;
    background: #fafafa;
    border: 1px solid #ccc;
    padding: 4px 8px;
  }
  .tabular { font-variant-numeric: tabular-nums; }
  .accent-sky .score-th { background: #e8f4fc; }
  .accent-emerald .score-th { background: #e8f7ef; }
  .accent-amber .score-th { background: #fef6e8; }
  .accent-violet .score-th { background: #f3effc; }
  .accent-rose .score-th { background: #fdeef2; }
  .text-block {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 9.5pt;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 2.5em;
  }
  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
`;

function buildFinalEvaluationPrintDocument(options: {
  groupName: string;
  entries: FinalEvaluationPrintEntry[];
  documentTitle: string;
}): string {
  const pages = options.entries
    .map((entry) => renderStudentPageHtml(options.groupName, entry))
    .join("\n");

  const printToolbar = `
    <div class="print-toolbar no-print">
      <p class="hint">
        아래 내용이 A4 미리보기입니다. <strong>PDF로 저장</strong> 버튼을 누른 뒤
        인쇄 창에서 「PDF로 저장」 또는 「Microsoft Print to PDF」를 선택하세요.
      </p>
      <button type="button" id="print-pdf-btn">PDF로 저장 (인쇄)</button>
    </div>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.documentTitle)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${printToolbar}
  <main id="print-content">
    ${pages}
  </main>
  <script>
    (function () {
      var btn = document.getElementById("print-pdf-btn");
      function runPrint() {
        window.focus();
        window.print();
      }
      if (btn) btn.addEventListener("click", runPrint);
    })();
  </script>
</body>
</html>`;
}

/** 숨김 iframe으로 인쇄 (팝업 차단 시 폴백) */
function printViaHiddenIframe(html: string): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "최종 평가 인쇄");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    document.body.removeChild(iframe);
    return false;
  }

  frameWindow.document.open();
  frameWindow.document.write(html);
  frameWindow.document.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  if (frameWindow.document.readyState === "complete") {
    window.setTimeout(triggerPrint, 600);
  } else {
    iframe.addEventListener("load", () => window.setTimeout(triggerPrint, 600), {
      once: true,
    });
  }

  return true;
}

/** Blob URL로 새 탭 미리보기 (noopener 없이 — document.write 빈 창 문제 회피) */
function openPrintPreviewTab(html: string, documentTitle: string): boolean {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  // noopener 사용 금지: null 반환 + 빈 탭만 열리는 브라우저 버그 방지
  const printWindow = window.open(blobUrl, "_blank");

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  printWindow.addEventListener(
    "load",
    () => {
      printWindow.document.title = documentTitle;
      URL.revokeObjectURL(blobUrl);
    },
    { once: true },
  );

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);

  return true;
}

/**
 * A4 미리보기 탭을 연다. 실패 시 숨김 iframe 인쇄로 폴백.
 */
export function openFinalEvaluationPrint(options: {
  groupName: string;
  entries: FinalEvaluationPrintEntry[];
}): boolean {
  if (options.entries.length === 0) {
    return false;
  }

  const titleSuffix =
    options.entries.length === 1
      ? options.entries[0].row.studentName
      : `전체_${options.entries.length}명`;

  const documentTitle = `최종평가_${options.groupName}_${titleSuffix}`;

  const html = buildFinalEvaluationPrintDocument({
    groupName: options.groupName,
    entries: options.entries,
    documentTitle,
  });

  if (openPrintPreviewTab(html, documentTitle)) {
    return true;
  }

  return printViaHiddenIframe(html);
}

/** 학생 1명 출력용 엔트리 생성 */
export function toPrintEntry(
  row: StudentFinalEvaluationRow,
  draft: { consultationSummary: string; professorFinalEvaluation: string },
): FinalEvaluationPrintEntry {
  return {
    row,
    consultationSummary: draft.consultationSummary,
    professorFinalEvaluation: draft.professorFinalEvaluation,
  };
}
