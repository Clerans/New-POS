import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button.js';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}) => {
  const getRange = (start: number, end: number) => {
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  };

  const fetchPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 5;
    const totalBlocks = totalNumbers + 2;

    if (totalPages > totalBlocks) {
      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

      const shouldShowLeftDots = leftSiblingIndex > 2;
      const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

      if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount;
        const leftRange = getRange(1, leftItemCount);
        return [...leftRange, '...', totalPages];
      }

      if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount;
        const rightRange = getRange(totalPages - rightItemCount + 1, totalPages);
        return [1, '...', ...rightRange];
      }

      if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = getRange(leftSiblingIndex, rightSiblingIndex);
        return [1, '...', ...middleRange, '...', totalPages];
      }
    }

    return getRange(1, totalPages);
  };

  const pages = fetchPageNumbers();

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t border-border mt-4 w-full">
      <span className="text-sm text-muted-foreground select-none">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" className="w-9 h-9 p-0" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="w-9 h-9 p-0" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={index} className="px-3 py-1.5 text-sm text-muted-foreground select-none">
                ...
              </span>
            );
          }

          return (
            <Button
              key={index}
              variant={currentPage === page ? 'primary' : 'outline'}
              size="sm"
              className="w-9 h-9 p-0"
              onClick={() => onPageChange(Number(page))}
            >
              {page}
            </Button>
          );
        })}

        <Button variant="outline" size="sm" className="w-9 h-9 p-0" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="w-9 h-9 p-0" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
export default Pagination;
