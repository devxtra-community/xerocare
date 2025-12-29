"use client";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="mt-6 flex items-center justify-center gap-4 text-sm">
      <button onClick={()=>onPageChange(page-1)}
        disabled={page===1}
        className="rounded-md border px-4 py-2 disabled:opacity-40">Previous</button>
      <span className="text-slate-600">Page {page} of {totalPages}</span>
      <button onClick={()=>onPageChange(page+1)}
        disabled={page===totalPages}
        className="rounded-md border px-4 py-2 disabled:opacity-40">Next</button>
    </div>
  );
}