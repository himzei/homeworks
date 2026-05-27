import type { RelatedNewsCategory } from "@/lib/related-news/keywords";

type NewsTextFields = {
  title: string;
  description?: string | null;
};

/**
 * SL(대구 에스엘)과 무관한 다른 'SL' 계열 키워드·기사.
 * - SL모터스 / SL공사 / 프린터 SL / SL 프레임 / 에스엘플랫폼 / 비에스엘 / SLP 등은 별도 업체·제품이므로 수집·표시에서 제외합니다.
 */
const SL_UNRELATED_PATTERNS: RegExp[] = [
  /sl\s*모터스/i,
  /에스엘\s*모터스/i,
  /sl모터스/i,
  /에스엘모터스/i,
  /sl\s*공사/i,
  /에스엘\s*공사/i,
  /sl공사/i,
  /에스엘공사/i,
  /sl\s*건설/i,
  /에스엘\s*건설/i,
  /sl모터스포츠/i,
  /에스엘모터스포츠/i,
  /금호\s*sl\s*모터/i,
  /오네\s*슈퍼레이스/i,
  /프린터\s*sl/i,
  /sl\s*프린터/i,
  /프린터\s*에스엘/i,
  /에스엘\s*프린터/i,
  /printer\s*sl/i,
  /sl\s*printer/i,
  /sl\s*프레임/i,
  /프레임\s*sl/i,
  /에스엘\s*프레임/i,
  /프레임\s*에스엘/i,
  /sl\s*frame/i,
  /frame\s*sl/i,
  /에스엘\s*플랫폼/i,
  /에스엘플랫폼/i,
  /sl\s*플랫폼/i,
  /sl\s*platform/i,
  /비에스엘/i,
  /\bBSL\b/,
];

/** SLP(별도 종목·브랜드) — URL 안의 slp 문자열 오매칭 방지 */
const SL_SLP_PATTERNS: RegExp[] = [
  /\bSLP\b/,
  /(?:^|[\s,[(「『"])SLP(?:[\s,.)」』"]|$)/,
  /에스엘피(?:\s|$|[.,·])/,
  /SLP\s*(홀딩스|그룹|주가|코스닥|코스피)/i,
];

function stripUrls(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, " ");
}

function buildSearchText({ title, description }: NewsTextFields): string {
  const plainDescription = description ? stripUrls(description) : "";
  return `${title}\n${plainDescription}`;
}

/** SL 카테고리에서 제외해야 하는 무관 기사인지 판별 */
export function isUnrelatedSlNews(fields: NewsTextFields): boolean {
  const haystack = buildSearchText(fields);
  if (SL_UNRELATED_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return true;
  }

  const titleAndPlain = `${fields.title}\n${fields.description ? stripUrls(fields.description) : ""}`;
  return SL_SLP_PATTERNS.some((pattern) => pattern.test(titleAndPlain));
}

/** 카테고리별로 무관 기사를 걸러냅니다 (SL만 적용). */
export function filterRelatedNewsRows<
  T extends NewsTextFields & { category: RelatedNewsCategory },
>(rows: T[]): T[] {
  return rows.filter((row) => {
    if (row.category !== "sl") return true;
    return !isUnrelatedSlNews(row);
  });
}
