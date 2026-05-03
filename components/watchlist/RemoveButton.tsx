'use client';

import { useState, useEffect, useRef } from 'react';

const UNDO_SECONDS = 5;

interface RemoveButtonProps {
  id: string;
  onRemoved: (id: string) => void;
}

export default function RemoveButton({ id, onRemoved }: RemoveButtonProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function commitDelete() {
    fetch(`/api/watchlist/${id}`, { method: 'DELETE' }).catch(() => {});
    onRemoved(id);
  }

  function handleRemove() {
    setCountdown(UNDO_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          commitDelete();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleUndo() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCountdown(null);
  }

  if (countdown !== null) {
    return (
      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        Removing in {countdown}s
        <button
          onClick={handleUndo}
          className="font-semibold underline transition-colors"
          style={{ color: 'var(--text)' }}
        >
          Undo
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={handleRemove}
      className="text-xs transition-colors"
      style={{ color: 'var(--text-subtle)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--risk-critical)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
    >
      Remove
    </button>
  );
}
