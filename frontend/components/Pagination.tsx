"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-2 flex items-center justify-center gap-1 text-[10px] sm:text-xs">
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-md border px-2 py-0.5 disabled:opacity-40"
      >
        &lt;
      </button>

      {/* Page numbers */}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={`px-2 py-0.5 rounded-md transition-colors ${
            page === num
              ? "bg-primary text-primary-foreground"
              : "border hover:bg-muted"
          }`}
        >
          {num}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-md border px-2 py-0.5 disabled:opacity-40"
      >
        &gt;
      </button>
    </div>
  );
}
