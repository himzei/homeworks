/**
 * 뉴스 요약/제목을 화면에 보여줄 순수 텍스트로 정리합니다.
 * - HTML 태그 제거
 * - &lt; &gt; 등 HTML 엔티티 디코딩
 */

/** HTML 엔티티를 일반 문자로 변환 (&amp;는 마지막에 처리) */
export function decodeHtmlEntities(text: string): string {
  let current = text;
  let previous = "";
  let guard = 0;

  while (current !== previous && guard < 5) {
    previous = current;
    current = current
      .replace(/&nbsp;/gi, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, num) =>
        String.fromCodePoint(Number.parseInt(num, 10)),
      )
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
    guard += 1;
  }

  return current;
}

/** 게시판에 표시할 제목 */
export function normalizeNewsTitle(title: string | null | undefined): string {
  return stripHtmlToPlainText(title ?? "");
}

/** HTML/엔티티가 섞인 문자열 → 순수 텍스트 */
export function stripHtmlToPlainText(text: string): string {
  if (!text) return "";

  let decoded = decodeHtmlEntities(text);
  decoded = decoded.replace(/<style[\s\S]*?<\/style>/gi, " ");
  decoded = decoded.replace(/<script[\s\S]*?<\/script>/gi, " ");
  decoded = decoded.replace(/<br\s*\/?>/gi, " ");
  decoded = decoded.replace(/<\/p>/gi, " ");
  decoded = decoded.replace(/<[^>]*>/g, " ");
  decoded = decodeHtmlEntities(decoded);

  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * 게시판에 표시할 요약 문장으로 정리.
 * - 링크 태그만 있는 Google RSS 요약 등은 null 반환
 */
export function normalizeNewsDescription(
  description: string | null | undefined,
  title?: string,
): string | null {
  const plain = stripHtmlToPlainText(description ?? "");
  if (!plain) return null;

  // 태그 제거 후에도 남은 링크/마크업 흔적
  if (/href\s*=/i.test(plain) || /target\s*=/i.test(plain)) return null;
  if (/^https?:\/\//i.test(plain)) return null;

  const plainTitle = title ? stripHtmlToPlainText(title) : "";
  if (plainTitle && plain === plainTitle) return null;

  return plain;
}
