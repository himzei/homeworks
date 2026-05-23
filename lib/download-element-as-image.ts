import { toPng } from "html-to-image";
import { LADDER_BODY_MIN_HEIGHT_PX } from "@/lib/ladder";

/** 다운로드 파일명에 쓸 수 없는 문자 제거 */
export function sanitizeDownloadFilename(name: string): string {
  const sanitized = name.replace(/[<>:"/\\|?*\n\r]/g, "_").trim();
  return sanitized.slice(0, 80) || "사다리결과";
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

  // 스타일 반영 후 레이아웃 안정화
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  try {
    const isDark = document.documentElement.classList.contains("dark");
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: isDark ? "#09090b" : "#ffffff",
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
