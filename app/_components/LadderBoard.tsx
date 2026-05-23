"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  downloadElementAsPng,
  sanitizeDownloadFilename,
} from "@/lib/download-element-as-image";
import {
  LADDER_BODY_MIN_HEIGHT_PX,
  traceLadderPathSteps,
  type LadderGameRecord,
} from "@/lib/ladder";
import { cn } from "@/lib/utils";

export type LadderBoardMode = "play" | "edit";

type LadderBoardProps = {
  /** 표시·추적할 사다리게임 (edit 모드에선 입력 중인 값으로 전달) */
  game: LadderGameRecord;
  /** play: 게임 시작 버튼으로 동시 애니메이션 / edit: 위·아래 칸이 input 으로 전환 */
  mode?: LadderBoardMode;
  onParticipantNameChange?: (index: number, value: string) => void;
  onResultItemChange?: (index: number, value: string) => void;
  /**
   * play 모드에서 빈 위쪽 칸을 클릭했을 때 호출.
   * - 지정 시: 빈 칸 클릭으로 로그인 사용자 이름 자동 입력 등 가능
   * - 미지정 시: 클릭 무시
   */
  onEmptyParticipantClick?: (index: number) => void;
  /**
   * play 모드에서 "게임 시작" 버튼을 처음 누른 순간 호출.
   * - 같은 사다리에서 [다시 시작] 으로 재생할 때는 호출되지 않음
   * - 부모에서 결과 고정(playedAt 마킹) 등에 사용
   */
  onGameStart?: () => void;
  /** 게임 시작 전: 위쪽 참가자 순서 무작위 섞기 */
  onShuffleParticipants?: () => void;
  /** 게임 시작 전: 아래쪽 결과 순서 무작위 섞기 */
  onShuffleResults?: () => void;
};

/**
 * 한 step(1행) 이동에 걸리는 시간 - 늘릴수록 천천히 내려옴.
 * - 각 step 은 내부적으로 "가로 phase(0 → .5)" + "세로 phase(.5 → 1)" 로 분리
 * - 가로 phase: 가로줄이 있는 경우만 시각적 의미 (없으면 0ms 처리)
 */
const STEP_DURATION_MS = 550;
const HORIZONTAL_PHASE_RATIO = 0.35; // step 중 가로 이동에 쓰는 비율

/** 흔적(경로) 선 두께 (픽셀) */
const TRAIL_STROKE_PX = 3;

/** 참가자 이름 칸 글자 크기 범위 (박스에 맞춰 자동 조절) */
const PARTICIPANT_NAME_MIN_FONT_PX = 11;
const PARTICIPANT_NAME_MAX_FONT_PX = 28;

/** 참가자별 색상 (HSL로 고르게 분포) */
function getParticipantColor(index: number, total: number): string {
  const hue = (index * 360) / Math.max(total, 1);
  return `hsl(${hue}, 70%, 50%)`;
}

/** 가로줄이 놓이는 SVG y (행 r 과 r+1 사이 중앙) */
function getRungCenterY(row: number): number {
  return row + 0.5;
}

/**
 * 경로 흔적용 점 시퀀스 생성.
 * - 가로줄 row (일반·점프 공통): (col, r) → (col, r+0.5) 내려가기 → 가로 이동 → (col, r+1)
 * - 빈 row: (col, r) → (col, r+1) 세로만
 */
function buildTrailPointSequence(
  path: number[],
  lastFullStep: number,
  isHalfPhase: boolean,
  rowTypes: Array<"horizontal" | "none">,
): string[] {
  const points: string[] = [`${path[0] + 0.5},0`];

  for (let stepIndex = 1; stepIndex <= lastFullStep; stepIndex += 1) {
    const prevCol = path[stepIndex - 1];
    const currCol = path[stepIndex];
    const row = stepIndex - 1;
    const rowType = rowTypes[row] ?? "none";
    const rungY = getRungCenterY(row);

    if (rowType === "horizontal" && currCol !== prevCol) {
      // L자 경로: 아래로 → 가로줄 따라 옆으로 → 다시 아래로
      points.push(`${prevCol + 0.5},${rungY}`);
      points.push(`${currCol + 0.5},${rungY}`);
      points.push(`${currCol + 0.5},${stepIndex}`);
    } else {
      points.push(`${currCol + 0.5},${stepIndex}`);
    }
  }

  // .5 phase: row N 가로 이동 중 → 가로줄 높이까지만 (다음 층 전)
  if (isHalfPhase && lastFullStep + 1 < path.length) {
    const row = lastFullStep;
    const prevCol = path[row];
    const currCol = path[row + 1];
    const rowType = rowTypes[row] ?? "none";
    if (rowType === "horizontal" && currCol !== prevCol) {
      const rungY = getRungCenterY(row);
      points.push(`${prevCol + 0.5},${rungY}`);
      points.push(`${currCol + 0.5},${rungY}`);
    }
  }

  return points;
}

type ParticipantNameCellProps = {
  label: string;
  displayName: string;
  accentColor: string;
  isHighlighted: boolean;
  disabled: boolean;
  emptyPlaceholder: string;
  onClick: () => void;
};

/**
 * 참가자 이름 칸.
 * - 박스 크기에 맞춰 글자 크기 자동 조절 (ResizeObserver)
 * - 배경·테두리: 참가자 색 / 글자: 흰색
 */
function ParticipantNameCell({
  label,
  displayName,
  accentColor,
  isHighlighted,
  disabled,
  emptyPlaceholder,
  onClick,
}: ParticipantNameCellProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSizePx, setFontSizePx] = useState(16);
  const hasName = Boolean(displayName);

  const fitTextToBox = useCallback(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl || !hasName) return;

    const computedStyle = window.getComputedStyle(container);
    const paddingX =
      (parseFloat(computedStyle.paddingLeft) || 0) +
      (parseFloat(computedStyle.paddingRight) || 0);
    const paddingY =
      (parseFloat(computedStyle.paddingTop) || 0) +
      (parseFloat(computedStyle.paddingBottom) || 0);
    const maxWidth = container.clientWidth - paddingX;
    const maxHeight = container.clientHeight - paddingY;

    if (maxWidth <= 0 || maxHeight <= 0) return;

    const minFontPx = PARTICIPANT_NAME_MIN_FONT_PX;
    // 박스 높이의 약 72% 까지 글자 크기로 사용 → 가능한 한 크게 표시
    const maxFontPx = Math.min(
      PARTICIPANT_NAME_MAX_FONT_PX,
      Math.max(minFontPx, Math.floor(maxHeight * 0.72)),
    );

    measureEl.style.width = `${maxWidth}px`;

    let bestSize = minFontPx;
    let low = minFontPx;
    let high = maxFontPx;

    const measureFontWeight = isHighlighted ? "800" : "700";

    while (low <= high) {
      const candidateSize = Math.floor((low + high) / 2);
      measureEl.style.fontSize = `${candidateSize}px`;
      measureEl.style.fontWeight = measureFontWeight;
      measureEl.style.lineHeight = "1.2";

      const fits =
        measureEl.scrollWidth <= maxWidth + 1 &&
        measureEl.scrollHeight <= maxHeight + 1;

      if (fits) {
        bestSize = candidateSize;
        low = candidateSize + 1;
      } else {
        high = candidateSize - 1;
      }
    }

    setFontSizePx(bestSize);
  }, [displayName, hasName, isHighlighted]);

  useEffect(() => {
    fitTextToBox();
    const container = containerRef.current;
    if (!container) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      fitTextToBox();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [fitTextToBox]);

  return (
    <button
      ref={containerRef}
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full px-1.5 py-2.5 rounded-lg border-2 transition-[background-color,border-color,box-shadow]",
        "text-center min-h-12 overflow-hidden",
        "flex items-center justify-center",
        hasName
          ? "text-white border-solid font-bold"
          : "text-zinc-500 dark:text-zinc-400 border-dashed border-zinc-300 dark:border-zinc-600 bg-transparent font-medium",
        isHighlighted && hasName && "font-extrabold shadow-sm",
        "disabled:cursor-not-allowed",
      )}
      style={
        hasName
          ? {
              backgroundColor: accentColor,
              borderColor: accentColor,
              fontSize: `${fontSizePx}px`,
              fontWeight: isHighlighted ? 800 : 700,
              lineHeight: 1.2,
            }
          : undefined
      }
    >
      {hasName ? (
        <span
          ref={measureRef}
          aria-hidden
          className={cn(
            "pointer-events-none invisible absolute inset-x-1.5 top-2 break-words whitespace-normal text-center",
            isHighlighted ? "font-extrabold" : "font-bold",
          )}
        >
          {displayName}
        </span>
      ) : null}
      <span
        className="w-full break-words whitespace-normal text-center"
        style={
          hasName
            ? {
                fontSize: `${fontSizePx}px`,
                fontWeight: isHighlighted ? 800 : 700,
                lineHeight: 1.2,
              }
            : undefined
        }
      >
        {hasName ? displayName : emptyPlaceholder}
      </span>
    </button>
  );
}

/**
 * 사다리 보드 시각화.
 * - play 모드: "게임 시작" 버튼으로 모든 참가자가 동시에 위에서 아래로 이동
 *   → 마커가 사다리를 따라 내려가며 가로줄에서 옆으로 이동
 *   → 도착 시 결과 카드 표시
 * - edit 모드: 위·아래 칸이 input 으로 바뀌어 인라인 편집
 */
export default function LadderBoard({
  game,
  mode = "play",
  onParticipantNameChange,
  onResultItemChange,
  onEmptyParticipantClick,
  onGameStart,
  onShuffleParticipants,
  onShuffleResults,
}: LadderBoardProps) {
  const isEditMode = mode === "edit";
  const columnCount = game.participantNames.length;
  /** 구버전 레코드(대각선 없음) 호환을 위해 항상 배열로 정규화 */
  const diagonalRungs = useMemo(
    () => game.diagonalRungs ?? [],
    [game.diagonalRungs],
  );

  /**
   * 각 참가자의 row 별 column 시퀀스.
   * - participantPaths[i][step] = i번 참가자가 step 번째 row 통과 후 위치한 column
   * - 길이 = rowCount + 1
   */
  const participantPaths = useMemo(() => {
    return game.participantNames.map((_, columnIndex) =>
      traceLadderPathSteps(
        game.rungs,
        diagonalRungs,
        game.rowCount,
        columnIndex,
      ),
    );
  }, [game.participantNames, game.rungs, diagonalRungs, game.rowCount]);

  /**
   * 각 row 의 타입.
   * - "horizontal": 일반 가로줄 또는 점프 가로줄이 있는 행 → 가로 phase → 세로 phase 로 분리 이동
   * - "none": 가로줄 없음 → 단순 세로 이동
   * - 점프 가로줄(diagonalRungs)도 시각적·동작 모두 수평 가로줄과 동일하게 처리
   */
  const rowTypes = useMemo<Array<"horizontal" | "none">>(() => {
    const types: Array<"horizontal" | "none"> = new Array(game.rowCount).fill(
      "none",
    );
    for (const rung of game.rungs) {
      if (rung.row >= 0 && rung.row < types.length) {
        types[rung.row] = "horizontal";
      }
    }
    for (const diag of diagonalRungs) {
      if (diag.row >= 0 && diag.row < types.length) {
        types[diag.row] = "horizontal";
      }
    }
    return types;
  }, [game.rungs, diagonalRungs, game.rowCount]);

  /**
   * 애니메이션 진행 step (0.5 단위).
   * - null: 시작 전 (마커 비표시)
   * - 정수 N (0 ~ rowCount): row N 위치, 가로/세로 이동 모두 완료된 상태
   * - N + 0.5: row N 가로줄 통과 직후(가로 이동 끝, 세로 이동 시작 전)
   *   - 즉 column 은 path[N+1] 의 값으로 이동했지만 top 은 row N 위치
   */
  const [animationStep, setAnimationStep] = useState<number | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const timerRef = useRef<number | null>(null);
  /** 이미지 저장 시 캡처할 영역 (사다리 + 결과 목록) */
  const exportRef = useRef<HTMLDivElement>(null);

  // 편집 모드로 전환되거나 게임 데이터(rungs/이름)가 바뀌면 진행도 초기화
  useEffect(() => {
    setAnimationStep(null);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [isEditMode, game.rungs, game.id]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isAnimating = animationStep !== null && animationStep < game.rowCount;
  const isAnimationDone =
    animationStep !== null && animationStep >= game.rowCount;

  /**
   * step 자동 진행 (setTimeout 체인).
   * - 정수 step N 에서 시작:
   *   - row N 에 가로 이동(column 변화) 이 한 명이라도 있으면 .5 phase 거침
   *   - 그 외에는 정수 step N+1 로 바로 (단순 세로 이동)
   * - .5 step 에서 시작: 항상 정수 step N+1 로 이동 (세로 이동 phase)
   */
  useEffect(() => {
    if (animationStep === null) return;
    if (animationStep >= game.rowCount) return;

    // 현재 step 이 정수인지(=다음 row 진입 직전), .5인지(=가로 이동 끝)
    const isHalfStep = animationStep % 1 !== 0;
    const currentRowIndex = Math.floor(animationStep); // 가로줄을 만나는 row

    if (isHalfStep) {
      // .5 단계 → 다음 정수 step 으로 이동 (세로 이동 phase)
      const duration = STEP_DURATION_MS * (1 - HORIZONTAL_PHASE_RATIO);
      timerRef.current = window.setTimeout(() => {
        setAnimationStep((prev) =>
          prev === null ? null : Math.floor(prev) + 1,
        );
      }, duration);
    } else {
      // 가로 이동(column 변화) 이 한 명이라도 있으면 .5 phase 진입
      const hasHorizontalMove = participantPaths.some(
        (path) => path[currentRowIndex + 1] !== path[currentRowIndex],
      );
      const duration = hasHorizontalMove
        ? STEP_DURATION_MS * HORIZONTAL_PHASE_RATIO
        : STEP_DURATION_MS;
      timerRef.current = window.setTimeout(() => {
        setAnimationStep((prev) => {
          if (prev === null) return null;
          return hasHorizontalMove ? prev + 0.5 : prev + 1;
        });
      }, duration);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [animationStep, game.rowCount, participantPaths]);

  const handleStartGame = useCallback(() => {
    if (isEditMode) return;
    if (columnCount === 0) return;
    // 최초 시작이면 부모에게 알림 (결과 고정 등에 사용)
    // - [다시 시작] 으로 누른 경우는 onGameStart 가 멱등이므로 부모 측 가드로 처리
    onGameStart?.();
    setAnimationStep(0);
  }, [isEditMode, columnCount, onGameStart]);

  const handleResetGame = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setAnimationStep(null);
  }, []);

  /** 게임 완료 후 사다리·결과를 PNG 이미지로 저장 */
  const handleDownloadResultImage = useCallback(async () => {
    const exportElement = exportRef.current;
    if (!exportElement) return;

    setIsDownloadingImage(true);
    try {
      const dateLabel = new Date().toISOString().slice(0, 10);
      const safeTitle = sanitizeDownloadFilename(game.title);
      await downloadElementAsPng(
        exportElement,
        `${safeTitle}_사다리결과_${dateLabel}.png`,
      );
    } catch {
      window.alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloadingImage(false);
    }
  }, [game.title]);

  /** 위쪽 칸 클릭: 빈 칸 + 외부 핸들러가 있을 때만 위임 (게임 진행 중에는 무시) */
  const handleTopClick = useCallback(
    (columnIndex: number) => {
      if (isEditMode || isAnimating) return;
      const currentName = game.participantNames[columnIndex];
      if (!currentName?.trim() && onEmptyParticipantClick) {
        onEmptyParticipantClick(columnIndex);
      }
    },
    [isEditMode, isAnimating, game.participantNames, onEmptyParticipantClick],
  );

  /** 애니메이션 시작점/도착점 column (헬퍼) */
  const animationStartByParticipant = useMemo(
    () => participantPaths.map((path) => path[0]),
    [participantPaths],
  );
  const animationEndByParticipant = useMemo(
    () => participantPaths.map((path) => path[path.length - 1]),
    [participantPaths],
  );

  /** 게임 시작 가능 여부: play 모드 + 참가자 1명 이상 */
  const canStartGame = !isEditMode && columnCount > 0;
  /** 최초 게임 시작 전 (섞기 버튼 노출 조건) */
  const isBeforeFirstGameStart = animationStep === null;
  const canShuffleParticipants =
    Boolean(onShuffleParticipants) && isBeforeFirstGameStart && !isEditMode;
  const canShuffleResults =
    Boolean(onShuffleResults) && isBeforeFirstGameStart && !isEditMode;

  /** play 모드: 게임 시작 전에는 사다리 숨김 / 편집 모드에서는 항상 표시 */
  const isLadderRevealed = isEditMode || animationStep !== null;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 w-full">
      {/* play 모드 액션 바: 게임 시작 / 다시 보기 */}
      {!isEditMode ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isAnimating
              ? "사다리를 내려가는 중..."
              : isAnimationDone
                ? "도착! 아래에서 각 참가자의 결과를 확인하세요."
                : "게임 시작 버튼을 누르면 모든 참가자가 동시에 내려갑니다."}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canShuffleParticipants ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onShuffleParticipants}
              >
                <Shuffle className="size-4" aria-hidden />
                참가자 다시 섞기
              </Button>
            ) : null}
            {canShuffleResults ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onShuffleResults}
              >
                <Shuffle className="size-4" aria-hidden />
                결과 다시 섞기
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={!canStartGame || isAnimating}
              onClick={handleStartGame}
            >
              <Play className="size-4" aria-hidden />
              {isAnimationDone ? "다시 시작" : "게임 시작"}
            </Button>
            {animationStep !== null ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isAnimating}
                onClick={handleResetGame}
              >
                <RotateCcw className="size-4" aria-hidden />
                초기화
              </Button>
            ) : null}
            {isAnimationDone ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDownloadingImage}
                onClick={handleDownloadResultImage}
              >
                <Download className="size-4" aria-hidden />
                {isDownloadingImage ? "저장 중..." : "결과 이미지 저장"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 이미지 저장 대상: 사다리 + 참가자·결과 + 결과 목록 */}
      <div
        ref={exportRef}
        data-ladder-export-root
        className={cn(
          "flex flex-col w-full flex-1 min-h-0",
          isAnimationDone &&
            "rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3",
        )}
      >
        {!isEditMode && isAnimationDone ? (
          <header className="shrink-0 mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base sm:text-lg font-bold text-black dark:text-zinc-50 truncate">
              {game.title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              사다리 게임 결과
            </p>
          </header>
        ) : null}

        {/* 사다리 전체 영역: flex-1 로 남는 세로 공간을 모두 차지 (한 화면에 fit) */}
        <div className="flex flex-col w-full flex-1 min-h-0">
          {/* 위쪽: 참가자 (시작점) - shrink-0 으로 사다리 펼침 시에도 글씨 영역 유지 */}
          <div
            className="grid gap-2 mb-2 shrink-0"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {game.participantNames.map((name, columnIndex) => {
              const displayName = name.trim();
              const participantLabel =
                displayName || `참가자 ${columnIndex + 1}`;

              if (isEditMode) {
                return (
                  <input
                    key={`top-edit-${columnIndex}`}
                    type="text"
                    value={name}
                    onChange={(event) =>
                      onParticipantNameChange?.(columnIndex, event.target.value)
                    }
                    placeholder={`참가자 ${columnIndex + 1}`}
                    maxLength={30}
                    className="px-2 py-2 text-xs sm:text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-zinc-50 placeholder:text-zinc-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                  />
                );
              }
              const accentColor = getParticipantColor(columnIndex, columnCount);
              const isHighlighted = isAnimationDone && Boolean(displayName);
              return (
                <ParticipantNameCell
                  key={`top-${columnIndex}`}
                  label={participantLabel}
                  displayName={displayName}
                  accentColor={accentColor}
                  isHighlighted={isHighlighted}
                  disabled={isAnimating}
                  onClick={() => handleTopClick(columnIndex)}
                  emptyPlaceholder={
                    onEmptyParticipantClick
                      ? "+ 이름 추가"
                      : `참가자 ${columnIndex + 1}`
                  }
                />
              );
            })}
          </div>

          {/* 사다리 본체 - 게임 시작 후 펼쳐지며 표시 (play 모드) */}
          <div
            data-ladder-body
            className={cn(
              "relative grid transition-[opacity,min-height] duration-500 ease-out",
              isLadderRevealed
                ? "flex-1 min-h-0 opacity-100"
                : "h-0 min-h-0 flex-none overflow-hidden opacity-0 pointer-events-none",
            )}
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              minHeight: isLadderRevealed
                ? `${LADDER_BODY_MIN_HEIGHT_PX}px`
                : 0,
            }}
            aria-hidden={!isLadderRevealed}
          >
            {isLadderRevealed ? (
              <>
                {/* 세로 레일 */}
                {game.participantNames.map((_, columnIndex) => (
                  <div
                    key={`rail-${columnIndex}`}
                    className="relative flex justify-center"
                  >
                    <div className="w-0.5 h-full bg-zinc-300 dark:bg-zinc-600" />
                  </div>
                ))}

                {/* 사다리 가로줄·대각선: SVG 단일 좌표계 (흔적·마커와 동일 viewBox) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${columnCount} ${game.rowCount}`}
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  {game.rungs.map((rung) => (
                    <line
                      key={`rung-${rung.row}-${rung.leftCol}`}
                      x1={rung.leftCol + 0.5}
                      y1={getRungCenterY(rung.row)}
                      x2={rung.leftCol + 1.5}
                      y2={getRungCenterY(rung.row)}
                      className="stroke-blue-500 dark:stroke-blue-400"
                      strokeWidth={2}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {diagonalRungs.map((diag, diagIndex) => {
                    // 점프 가로줄: 양방향 swap 의미에 맞춰 수평선으로 그림
                    const minCol = Math.min(diag.fromCol, diag.toCol);
                    const maxCol = Math.max(diag.fromCol, diag.toCol);
                    const rungY = getRungCenterY(diag.row);
                    return (
                      <line
                        key={`jump-${diag.row}-${diag.fromCol}-${diagIndex}`}
                        x1={minCol + 0.5}
                        y1={rungY}
                        x2={maxCol + 0.5}
                        y2={rungY}
                        className="stroke-emerald-500 dark:stroke-emerald-400"
                        strokeWidth={2}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </svg>

                {/* 흔적(경로) 오버레이: 사다리 SVG 와 동일 좌표계 */}
                {!isEditMode && animationStep !== null && columnCount > 0 ? (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${columnCount} ${game.rowCount}`}
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    {participantPaths.map((path, participantIndex) => {
                      const lastFullStep = Math.floor(animationStep);
                      const isHalfPhase = animationStep % 1 !== 0;

                      if (lastFullStep === 0 && !isHalfPhase) return null;

                      const trailPoints = buildTrailPointSequence(
                        path,
                        lastFullStep,
                        isHalfPhase,
                        rowTypes,
                      );

                      if (trailPoints.length < 2) return null;

                      const color = getParticipantColor(
                        participantIndex,
                        columnCount,
                      );
                      return (
                        <polyline
                          key={`trail-${participantIndex}`}
                          points={trailPoints.join(" ")}
                          stroke={color}
                          strokeWidth={TRAIL_STROKE_PX}
                          strokeOpacity={0.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>
                ) : null}

                {/* 마커: viewBox 와 동일 비율 (top/left %) */}
                {!isEditMode && animationStep !== null
                  ? (() => {
                      const isHalfPhase = animationStep % 1 !== 0;
                      const baseStep = Math.floor(animationStep);
                      const crossingRow = isHalfPhase ? baseStep : baseStep - 1;
                      const crossingRowType =
                        crossingRow >= 0
                          ? (rowTypes[crossingRow] ?? "none")
                          : "none";

                      let markerTransition: string;
                      if (animationStep === 0) {
                        markerTransition = "none";
                      } else if (isHalfPhase) {
                        // N → N.5: 가로줄 높이로 내려가며 가로 이동
                        markerTransition = `left ${STEP_DURATION_MS * HORIZONTAL_PHASE_RATIO}ms linear, top ${STEP_DURATION_MS * HORIZONTAL_PHASE_RATIO}ms linear`;
                      } else {
                        const cameFromHalfPhase =
                          crossingRowType === "horizontal" &&
                          participantPaths.some(
                            (path) => path[baseStep] !== path[baseStep - 1],
                          );
                        markerTransition = cameFromHalfPhase
                          ? `top ${STEP_DURATION_MS * (1 - HORIZONTAL_PHASE_RATIO)}ms linear, left 0ms`
                          : `top ${STEP_DURATION_MS}ms linear, left 0ms`;
                      }

                      return game.participantNames.map(
                        (_, participantIndex) => {
                          const path = participantPaths[participantIndex];
                          const columnIndex = isHalfPhase
                            ? Math.min(baseStep + 1, path.length - 1)
                            : Math.min(baseStep, path.length - 1);
                          const currentColumn = path[columnIndex];
                          const color = getParticipantColor(
                            participantIndex,
                            columnCount,
                          );
                          // .5 phase: 가로줄 높이 (row + 0.5) / rowCount
                          const markerY = isHalfPhase
                            ? baseStep + 0.5
                            : baseStep;
                          const topPercent = (markerY / game.rowCount) * 100;
                          const leftPercent =
                            ((currentColumn + 0.5) / columnCount) * 100;
                          return (
                            <div
                              key={`marker-${participantIndex}`}
                              className="absolute z-10 pointer-events-none"
                              style={{
                                top: `${topPercent}%`,
                                left: `${leftPercent}%`,
                                transform: "translate(-50%, -50%)",
                                transition: markerTransition,
                              }}
                              aria-hidden
                            >
                              <div
                                className="size-3.5 rounded-full border-2 border-white dark:border-zinc-950 shadow-md"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                          );
                        },
                      );
                    })()
                  : null}
              </>
            ) : null}
          </div>

          {/* 아래쪽: 결과 항목 (도착점) - 자기 높이 */}
          <div
            className="grid gap-2 mt-2"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {game.resultItems.map((item, columnIndex) => {
              if (isEditMode) {
                return (
                  <input
                    key={`bottom-edit-${columnIndex}`}
                    type="text"
                    value={item}
                    onChange={(event) =>
                      onResultItemChange?.(columnIndex, event.target.value)
                    }
                    placeholder={`결과 ${columnIndex + 1}`}
                    maxLength={30}
                    className="px-2 py-2 text-xs sm:text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-black dark:text-zinc-50 placeholder:text-zinc-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                  />
                );
              }
              // play 모드: 애니메이션 완료 시 도착한 참가자 색으로 강조
              const arrivedParticipantIndex = isAnimationDone
                ? animationEndByParticipant.findIndex(
                    (endCol) => endCol === columnIndex,
                  )
                : -1;
              const arrivedColor =
                arrivedParticipantIndex >= 0
                  ? getParticipantColor(arrivedParticipantIndex, columnCount)
                  : null;
              return (
                <div
                  key={`bottom-${columnIndex}`}
                  className={cn(
                    "px-2 py-2 text-xs sm:text-sm font-medium rounded-lg border-2 text-center truncate transition-colors",
                    !item && "text-zinc-400 dark:text-zinc-500 border-dashed",
                    !arrivedColor &&
                      "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400",
                  )}
                  style={
                    arrivedColor
                      ? {
                          borderColor: arrivedColor,
                          color: arrivedColor,
                        }
                      : undefined
                  }
                >
                  {item}
                </div>
              );
            })}
          </div>
        </div>

        {/* 애니메이션 완료 후: 각 참가자별 결과 카드 (높이 제한 + 스크롤 → 한 화면 fit) */}
        {!isEditMode && isAnimationDone ? (
          <div
            data-export-expand
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 max-h-40 overflow-y-auto shrink-0 mt-3"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              참가자별 결과
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
              {game.participantNames.map((name, participantIndex) => {
                const endColumn =
                  animationEndByParticipant[participantIndex] ??
                  animationStartByParticipant[participantIndex];
                const result = game.resultItems[endColumn]?.trim() ?? "";
                const color = getParticipantColor(
                  participantIndex,
                  columnCount,
                );
                return (
                  <li
                    key={`result-${participantIndex}`}
                    className="flex items-center gap-2 text-sm rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5"
                  >
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="shrink-0 text-black dark:text-zinc-50 font-medium">
                      {name.trim() || `참가자 ${participantIndex + 1}`}
                    </span>
                    <span className="text-zinc-400 shrink-0">→</span>
                    <span
                      className="font-medium text-black dark:text-zinc-50 break-words min-w-0"
                      style={result ? { color } : undefined}
                    >
                      {result}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
