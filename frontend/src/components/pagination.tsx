import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Paginated } from "@/types";
import { Button } from "./ui";

export function Pagination({
  page,
  onPageChange,
}: {
  page: Pick<Paginated<unknown>, "page" | "totalPages" | "total">;
  onPageChange: (next: number) => void;
}) {
  if (page.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4 text-sm">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page.page - 1)} disabled={page.page <= 1} icon={<ChevronLeft className="size-4" aria-hidden />}>
        <span className="max-sm:sr-only">Previous</span>
      </Button>
      <span className="tabular-nums text-muted">
        Page <span className="font-semibold text-ink">{page.page}</span> of {page.totalPages}
        <span className="max-sm:hidden"> ({page.total.toLocaleString()} total)</span>
      </span>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page.page + 1)} disabled={page.page >= page.totalPages} trailingIcon={<ChevronRight className="size-4" aria-hidden />}>
        <span className="max-sm:sr-only">Next</span>
      </Button>
    </nav>
  );
}
