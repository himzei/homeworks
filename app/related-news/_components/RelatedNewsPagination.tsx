import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/_components/ui/pagination";

type RelatedNewsPaginationProps = {
  basePath: string;
  currentPage: number;
  totalPages: number;
};

function buildPageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}

function buildPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
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
  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    pages.push(page);
  }
  pages.push("ellipsis", totalPages);
  return pages;
}

/** 관련뉴스 게시판 페이지네이션 */
export default function RelatedNewsPagination({
  basePath,
  currentPage,
  totalPages,
}: RelatedNewsPaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildPageHref(basePath, Math.max(1, currentPage - 1))}
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
                href={buildPageHref(basePath, page)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href={buildPageHref(basePath, Math.min(totalPages, currentPage + 1))}
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
