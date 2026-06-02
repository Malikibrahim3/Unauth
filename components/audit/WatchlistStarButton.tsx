'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { useAdjustStateWhenPropChanges } from '@/lib/react/adjustStateWhenPropChanges';

const UNDO_SECONDS = 5;

interface WatchlistStarButtonProps {
  customerProfileId?: string;
  emailHash?: string;
  displayName?: string;
  displayEmail?: string;
  lastSeenRisk?: string;
  initialWatchlisted?: boolean;
  /** Watchlist entry ID, required for remove to work */
  watchlistEntryId?: string | null;
}

export default function WatchlistStarButton({
  customerProfileId,
  emailHash,
  displayName,
  displayEmail,
  lastSeenRisk,
  initialWatchlisted = false,
  watchlistEntryId: initialEntryId = null,
}: WatchlistStarButtonProps) {
  const [watchlisted, setWatchlisted] = useAdjustStateWhenPropChanges(
    initialWatchlisted,
    (value) => value,
    initialWatchlisted,
  );
  const entryIdRef = useRef<string | null>(initialEntryId);
  const prevInitialEntryIdRef = useRef(initialEntryId);
  if (initialEntryId !== prevInitialEntryIdRef.current) {
    prevInitialEntryIdRef.current = initialEntryId;
    entryIdRef.current = initialEntryId;
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deleteRef = useRef<string | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function commitRemove(id: string) {
    fetch(`/api/watchlist/${id}`, { method: 'DELETE' }).catch(() => {});
    setWatchlisted(false);
    entryIdRef.current = null;
    deleteRef.current = null;
  }

  function startUndo(id: string) {
    deleteRef.current = id;
    setUndoCountdown(UNDO_SECONDS);
    setWatchlisted(false);
    timerRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          if (deleteRef.current) commitRemove(deleteRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleUndo() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    deleteRef.current = null;
    setUndoCountdown(null);
    setWatchlisted(true);
  }

  async function toggle() {
    if (loading) return;
    setError(null);

    if (watchlisted) {
      const entryId = entryIdRef.current;
      if (entryId) {
        startUndo(entryId);
      } else {
        setWatchlisted(false);
      }
      return;
    }

    setLoading(true);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerProfileId, emailHash, displayName, displayEmail, lastSeenRisk }),
    });
    if (res.ok) {
      const json = await res.json();
      entryIdRef.current = json.entry?.id ?? null;
      setWatchlisted(true);
    } else {
      setError('Failed to add to watchlist');
    }
    setLoading(false);
  }

  if (undoCountdown !== null) {
    return (
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-sm border"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          Removed in {undoCountdown}s
          <button
            type="button"
            onClick={handleUndo}
            className="font-semibold underline transition-colors hover:opacity-80"
            style={{ color: 'var(--text)' }}
          >
            Undo
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-pressed={watchlisted}
        aria-label={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
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
        {loading ? '…' : watchlisted ? 'Watchlisted' : 'Watch'}
      </button>
      {error && (
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--risk-critical)' }}>
          <AlertCircle className="h-3 w-3" />{error}
        </span>
      )}
    </span>
  );
}
