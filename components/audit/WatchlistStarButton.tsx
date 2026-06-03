interface WatchlistStarButtonProps {
  customerProfileId?: string;
  emailHash?: string;
  displayName?: string;
  displayEmail?: string;
  lastSeenRisk?: string;
  initialWatchlisted?: boolean;
  watchlistEntryId?: string | null;
}

export default function WatchlistStarButton(_: WatchlistStarButtonProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs font-medium"
      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
      title="Case-scoped review has replaced customer watchlists. Open a claim or evidence workflow to save follow-up context."
    >
      Case-scoped review only
    </span>
  );
}
