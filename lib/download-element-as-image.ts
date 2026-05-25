import { toPng } from "html-to-image";
import { LADDER_BODY_MIN_HEIGHT_PX } from "@/lib/ladder";

/** 다운로드 파일명에 쓸 수 없는 문자 제거 */
export function sanitizeDownloadFilename(name: string): string {
  const sanitized = name.replace(/[<>:"/\\|?*\n\r]/g, "_").trim();
  return sanitized.slice(0, 80) || "사다리결과";
}

/** 캡처에 필요한 전체 너비·높이 (자식 스크롤 영역 포함) */
function getElementFullSize(element: HTMLElement): {
  width: number;
  height: number;
} {
  let width = Math.max(element.scrollWidth, element.offsetWidth);
  let height = Math.max(element.scrollHeight, element.offsetHeight);

  element.querySelectorAll("[data-export-scroll-x]").forEach((node) => {
    if (node instanceof HTMLElement) {
      width = Math.max(width, node.scrollWidth, node.offsetWidth);
      height = Math.max(height, node.scrollHeight, node.offsetHeight);
    }
  });

  return { width, height };
}

/** 캡처 직전 레이아웃 안정화 (스타일 반영 대기) */
function waitForLayoutStable(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** 캡처 직전에 잠깐 바꿀 스타일을 저장하고, 복구 함수를 반환 */
function applyTempStyles(
  element: HTMLElement,
  styles: Record<string, string>,
): () => void {
  const previous: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    previous[key] = element.style.getPropertyValue(key);
    element.style.setProperty(key, value);
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value) {
        element.style.setProperty(key, value);
      } else {
        element.style.removeProperty(key);
      }
    }
  };
}

/**
 * DOM 영역을 PNG 로 캡처해 다운로드.
 * - flex / max-height 로 잘리는 구간은 캡처 직전에 잠시 해제
 * - 다크 모드면 배경색을 zinc-950 에 맞춤
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const restoreFns: Array<() => void> = [];

  // 루트: 스크롤·flex 제약 해제 → 전체 내용이 이미지에 들어가도록
  restoreFns.push(
    applyTempStyles(element, {
      height: "auto",
      "max-height": "none",
      overflow: "visible",
      flex: "none",
    }),
  );

  // 과제 평가 그리드 sticky 해제 (캡처 시 잘림·겹침 방지)
  element
    .querySelectorAll(
      ".evaluation-grid-sticky-corner, .evaluation-grid-sticky-header, .evaluation-grid-sticky-name",
    )
    .forEach((node) => {
      if (node instanceof HTMLElement) {
        restoreFns.push(
          applyTempStyles(node, {
            position: "static",
            left: "auto",
            top: "auto",
            zIndex: "auto",
          }),
        );
      }
    });

  // 결과 목록 등 스크롤 영역 펼치기
  element.querySelectorAll("[data-export-expand]").forEach((node) => {
    if (node instanceof HTMLElement) {
      restoreFns.push(
        applyTempStyles(node, {
          "max-height": "none",
          overflow: "visible",
        }),
      );
    }
  });

  // 가로 스크롤 그리드(과제 평가 등): 숨겨진 열까지 전체 너비로 펼침
  element.querySelectorAll("[data-export-scroll-x]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;

    const captureWidth = Math.max(node.scrollWidth, node.offsetWidth);
    restoreFns.push(
      applyTempStyles(node, {
        overflow: "visible",
        "overflow-x": "visible",
        width: `${captureWidth}px`,
        "min-width": `${captureWidth}px`,
        "max-width": "none",
      }),
    );

    node.querySelectorAll(".inline-block, .inline-grid").forEach((child) => {
      if (child instanceof HTMLElement) {
        restoreFns.push(
          applyTempStyles(child, {
            width: `${captureWidth}px`,
            "min-width": `${captureWidth}px`,
            "max-width": "none",
            display: child.classList.contains("inline-grid")
              ? "inline-grid"
              : "block",
          }),
        );
      }
    });
  });

  // 캡처 영역 내 텍스트 말줄임 해제 (열 제목·이름 등)
  element
    .querySelectorAll(".truncate, .line-clamp-2, .line-clamp-3")
    .forEach((node) => {
      if (node instanceof HTMLElement) {
        restoreFns.push(
          applyTempStyles(node, {
            overflow: "visible",
            "text-overflow": "clip",
            "white-space": "normal",
            display: "block",
            "-webkit-line-clamp": "unset",
            "-webkit-box-orient": "unset",
          }),
        );
      }
    });

  // 사다리 본체: 실제 그려진 높이만큼 확보
  const ladderBody = element.querySelector("[data-ladder-body]");
  if (ladderBody instanceof HTMLElement) {
    const captureHeight = Math.max(
      ladderBody.scrollHeight,
      ladderBody.offsetHeight,
      LADDER_BODY_MIN_HEIGHT_PX,
    );
    restoreFns.push(
      applyTempStyles(ladderBody, {
        flex: "none",
        "min-height": `${captureHeight}px`,
        height: `${captureHeight}px`,
      }),
    );
  }

  await waitForLayoutStable();

  const { width: captureWidth, height: captureHeight } =
    getElementFullSize(element);

  restoreFns.push(
    applyTempStyles(element, {
      width: `${captureWidth}px`,
      "min-width": `${captureWidth}px`,
      "max-width": "none",
      height: `${captureHeight}px`,
      "min-height": `${captureHeight}px`,
    }),
  );

  await waitForLayoutStable();

  try {
    const isDark = document.documentElement.classList.contains("dark");
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      width: captureWidth,
      height: captureHeight,
      backgroundColor: isDark ? "#09090b" : "#ffffff",
      style: {
        width: `${captureWidth}px`,
        height: `${captureHeight}px`,
        overflow: "visible",
        transform: "none",
      },
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        // 캡처에서 제외할 요소 (버튼 등)
        return !node.hasAttribute("data-export-ignore");
      },
    });

    const link = document.createElement("a");
    link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    for (let index = restoreFns.length - 1; index >= 0; index -= 1) {
      restoreFns[index]();
    }
  }
}

/**
 * 화면에 숨겨 둔 DOM 을 복제해 뷰포트에 올린 뒤 PNG 캡처.
 * (far off-screen / z-index:-1 요소는 캡처가 비어 나오는 경우가 많음)
 */
export async function downloadClonedElementAsPng(
  source: HTMLElement,
  filename: string,
): Promise<void> {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("aria-hidden");
  clone.removeAttribute("id");
  clone.className = "";

  const { width: captureWidth } = getElementFullSize(source);
  const resolvedWidth = Math.max(captureWidth, 960);

  document.body.appendChild(clone);

  const restoreCloneLayout = applyTempStyles(clone, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "2147483647",
    width: `${resolvedWidth}px`,
    margin: "0",
    padding: "0",
    opacity: "1",
    visibility: "visible",
    display: "block",
    overflow: "visible",
    pointerEvents: "none",
    transform: "none",
  });

  await waitForLayoutStable();

  try {
    await downloadElementAsPng(clone, filename);
  } finally {
    restoreCloneLayout();
    clone.remove();
  }
}
