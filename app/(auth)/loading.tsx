export default function AuthLoading() {
  return (
    <section className="ua-auth-card" aria-busy="true" aria-label="Loading account access">
      <div className="h-10 w-10 animate-pulse rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-surface-muted)]" />
      <div className="mt-5 h-8 w-48 animate-pulse rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)]" />
      <div className="mt-8 space-y-4">
        <div className="h-16 animate-pulse rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)]" />
        <div className="h-16 animate-pulse rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)]" />
        <div className="h-10 animate-pulse rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-surface-muted)]" />
      </div>
    </section>
  );
}
