interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const widths = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-5/6", "w-2/5"];

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="animate-pulse bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] animate-shimmer">
        {/* Header */}
        <div className="flex gap-4 bg-muted/30 px-4 py-3 border-b border-border">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={`h-${c}`}
              className={`h-3 rounded bg-muted-foreground/15 ${widths[c % widths.length]}`}
              style={{ flex: 1 }}
            />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`r-${r}`}
            className="flex gap-4 px-4 py-3.5 border-b border-border last:border-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={`r-${r}-c-${c}`}
                className={`h-3 rounded bg-muted-foreground/10 ${widths[(r + c) % widths.length]}`}
                style={{ flex: 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
