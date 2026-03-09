import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
};

/**
 * Reusable pagination control component.
 * Displays current page, total pages, and navigation buttons.
 * Enhanced with premium styling and item count display.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  // Determine pagination bounds if total and limit are provided
  const startItem = total !== undefined && limit !== undefined ? (page - 1) * limit + 1 : null;
  const endItem = total !== undefined && limit !== undefined ? Math.min(page * limit, total) : null;

  return (
    <div className="p-4 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between bg-card text-xs gap-4">
      <div className="text-muted-foreground font-medium">
        {startItem !== null && endItem !== null && total !== undefined ? (
          <>
            Showing <span className="text-primary font-bold">{startItem}</span> to{' '}
            <span className="text-primary font-bold">{endItem}</span> of{' '}
            <span className="text-primary font-bold">{total}</span> items
          </>
        ) : (
          <>
            Page <span className="text-primary font-bold">{page}</span> of{' '}
            <span className="text-primary font-bold">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-muted/50 text-[11px] px-3"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Prev
        </Button>

        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            // Only show a limited number of page buttons if there are many pages
            if (
              totalPages > 7 &&
              pageNum !== 1 &&
              pageNum !== totalPages &&
              Math.abs(pageNum - page) > 1
            ) {
              if (pageNum === 2 && page > 4) return <span key="dots1">...</span>;
              if (pageNum === totalPages - 1 && page < totalPages - 3)
                return <span key="dots2">...</span>;
              return null;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  page === pageNum
                    ? 'bg-primary text-white font-bold shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-primary font-medium'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page === totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
          className="h-8 rounded-lg border-gray-100 text-gray-600 hover:bg-muted/50 text-[11px] px-3"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
