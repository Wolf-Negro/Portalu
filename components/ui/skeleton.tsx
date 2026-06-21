export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "rgba(114,85,180,0.12)", ...style }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl p-5 space-y-3"
      style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl overflow-hidden p-4 space-y-3"
      style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ compact = false }: { compact?: boolean } = {}) {
  if (compact) {
    return <Skeleton className="w-full h-full min-h-[80px]" />;
  }
  return (
    <div className="rounded-xl p-5"
      style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
      <Skeleton className="h-3 w-1/4 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
