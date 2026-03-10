import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  function getPages(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    // Always show first page
    pages.push(1);
    if (page > 3) pages.push("ellipsis");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push("ellipsis");
    // Always show last page
    pages.push(totalPages);
    return pages;
  }

  const items = getPages();

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Page precedente"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">
            ...
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 transition-all duration-200${item === page ? " animate-scale-in" : ""}`}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
