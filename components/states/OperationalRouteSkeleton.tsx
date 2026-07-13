export function OperationalRouteSkeleton({
  title = "Loading workspace",
  rows = 6,
  detail = false,
}: {
  title?: string;
  rows?: number;
  detail?: boolean;
}) {
  return (
    <main
      className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6"
      aria-busy="true"
      aria-label={title}
    >
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-[var(--surface-sunken)]" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[var(--surface-sunken)]" />
      </div>
      {detail ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {Array.from({ length: Math.max(3, rows) }, (_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-lg border border-[var(--border-muted)] bg-[var(--surface)]"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-lg border border-[var(--border-muted)] bg-[var(--surface)]" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="h-11 animate-pulse bg-[var(--surface-sunken)]" />
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse border-t border-[var(--border-muted)] bg-[var(--surface)]"
            />
          ))}
        </div>
      )}
      <span className="sr-only">{title}</span>
    </main>
  );
}
