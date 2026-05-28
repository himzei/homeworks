"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import { Button } from "@/app/_components/ui/button";

export type ProjectEvaluationExportRow = {
  teamNumber: number;
  profileId: string;
  name: string;
  roleLabel: string; // "조장" | "조원"
  workAssignment: string;
  topic: number | null;
  responsibility: number | null;
  dataAnalysis: number | null;
  resultQuality: number | null;
  explanation: number | null;
  total: number | null;
  grade: string | null;
  feedback: string;
};

type Props = {
  title: string;
  cohortLabel: string;
  evaluationDateLabel: string;
  rows: ProjectEvaluationExportRow[];
  /** PNG 캡처 대상 영역 */
  children: React.ReactNode;
};

function csvEscape(value: string): string {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function buildCsv(rows: ProjectEvaluationExportRow[]): string {
  const header = [
    "조",
    "이름",
    "역할",
    "업무 분장",
    "주제(20)",
    "업무분장점수(20)",
    "데이터분석(20)",
    "결과도출(20)",
    "설명력(20)",
    "총점(100)",
    "등급",
    "보완 및 피드백",
  ];

  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((row) =>
      [
        String(row.teamNumber),
        row.name,
        row.roleLabel,
        row.workAssignment,
        row.topic === null ? "" : String(row.topic),
        row.responsibility === null ? "" : String(row.responsibility),
        row.dataAnalysis === null ? "" : String(row.dataAnalysis),
        row.resultQuality === null ? "" : String(row.resultQuality),
        row.explanation === null ? "" : String(row.explanation),
        row.total === null ? "" : String(row.total),
        row.grade ?? "",
        row.feedback,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  // 한글 주석: 엑셀 호환을 위해 UTF-8 BOM 추가
  return "\uFEFF" + lines.join("\n");
}

export default function ProjectEvaluationExportButtons({
  title,
  cohortLabel,
  evaluationDateLabel,
  rows,
  children,
}: Props) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  const handleDownloadCsv = () => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = sanitizeDownloadFilename(title);
    const safeCohort = sanitizeDownloadFilename(cohortLabel);
    a.href = url;
    a.download = `${safeTitle}_${safeCohort}_프로젝트평가_${evaluationDateLabel}.csv`;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async () => {
    const element = exportRef.current;
    if (!element) return;

    setIsDownloadingImage(true);
    try {
      const safeTitle = sanitizeDownloadFilename(title);
      const safeCohort = sanitizeDownloadFilename(cohortLabel);
      await downloadElementAsPng(
        element,
        `${safeTitle}_${safeCohort}_프로젝트평가_${evaluationDateLabel}.png`,
      );
    } catch {
      window.alert("이미지 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2" data-export-ignore>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadCsv}
          disabled={rows.length === 0}
        >
          <FileSpreadsheet className="size-4" />
          CSV 다운로드
        </Button>
        <Button
          type="button"
          className="bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => void handleDownloadImage()}
          disabled={rows.length === 0 || isDownloadingImage}
        >
          {isDownloadingImage ? (
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

      <div ref={exportRef}>{children}</div>
    </div>
  );
}

