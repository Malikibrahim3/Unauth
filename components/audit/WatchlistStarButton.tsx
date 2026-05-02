'use client';

import { useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';

interface WatchlistStarButtonProps {
  customerProfileId?: string;
  emailHash?: string;
  displayName?: string;
  displayEmail?: string;
  lastSeenRisk?: string;
  initialWatchlisted?: boolean;
}

export default function WatchlistStarButton({
  customerProfileId,
  emailHash,
  displayName,
  displayEmail,
  lastSeenRisk,
  initialWatchlisted = false,
}: WatchlistStarButtonProps) {
  const [watchlisted, setWatchlisted] = useState(initialWatchlisted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    if (watchlisted) {
      setWatchlisted(false);
    } else {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerProfileId, emailHash, displayName, displayEmail, lastSeenRisk }),
      });
      if (res.ok) {
        setWatchlisted(true);
      } else {
        setError('Failed to add to watchlist');
      }
    }
    setLoading(false);
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        onClick={toggle}
        disabled={loading}
        title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-sm transition-colors"
        style={watchlisted
          ? { color: 'var(--watchlist)', background: 'var(--watchlist-bg)' }
          : { color: 'var(--text-muted)' }
        }
      >
        <Star
          className="h-3.5 w-3.5"
          style={watchlisted ? { fill: 'var(--watchlist)', color: 'var(--watchlist)' } : {}}
        />
        {watchlisted ? 'Watchlisted' : 'Watch'}
      </button>
      {error && (
        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--risk-critical)' }}>
          <AlertCircle className="h-3 w-3" />{error}
        </span>
      )}
    </span>
  );
}
