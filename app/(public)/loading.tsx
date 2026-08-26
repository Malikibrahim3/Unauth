import { PublicShell } from '@/components/system/PublicShell';

export default function PublicLoading() {
  return (
    <PublicShell surfaceId="public-route-loading" busy>
      <div className="mx-auto grid min-h-[65dvh] w-full max-w-6xl place-content-center px-4">
        <div className="h-10 w-64 rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-muted)]" />
        <div className="mt-4 h-4 w-80 max-w-full rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-muted)]" />
      </div>
    </PublicShell>
  );
}
