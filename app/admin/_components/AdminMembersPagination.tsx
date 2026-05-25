import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/_components/ui/pagination";

type AdminMembersPaginationProps = {
  currentPage: number;
  totalPages: number;
  /** group 등 기존 쿼리 유지용 */
  preservedQuery?: string;
};

function buildPageHref(page: number, preservedQuery: string): string {
  const raw = preservedQuery.startsWith("?")
    ? preservedQuery.slice(1)
    : preservedQuery;
  const params = new URLSearchParams(raw);
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/admin/members?${query}` : "/admin/members";
}

function buildPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (currentPage <= 4) {
    for (let page = 2; page <= 5; page++) pages.push(page);
    pages.push("ellipsis", totalPages);
    return pages;
  }

  if (currentPage >= totalPages - 3) {
    pages.push("ellipsis");
    for (let page = totalPages - 4; page <= totalPages; page++) pages.push(page);
    return pages;
  }

  pages.push("ellipsis");
  for (let page = currentPage - 1; page <= currentPage + 1; page++) pages.push(page);
  pages.push("ellipsis", totalPages);
  return pages;
}

/**
 * 회원 관리 목록 서버 페이지네이션
 */
export default function AdminMembersPagination({
  currentPage,
  totalPages,
  preservedQuery = "",
}: AdminMembersPaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildPageHref(Math.max(1, currentPage - 1), preservedQuery)}
            aria-disabled={currentPage === 1}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : undefined
            }
          />
        </PaginationItem>

        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href={buildPageHref(page, preservedQuery)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={buildPageHref(Math.min(totalPages, currentPage + 1), preservedQuery)}
            aria-disabled={currentPage === totalPages}
            className={
              currentPage === totalPages
                ? "pointer-events-none opacity-50"
                : undefined
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
