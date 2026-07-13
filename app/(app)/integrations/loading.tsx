export default function IntegrationsLoading() {
  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" aria-busy="true" aria-label="Loading integrations"><div className="h-7 w-48 animate-pulse rounded bg-[var(--surface-sunken)]" /><div className="grid gap-3 sm:grid-cols-3">{[0,1,2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />)}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4,5].map((item) => <div key={item} className="h-52 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />)}</div></div>;
}
