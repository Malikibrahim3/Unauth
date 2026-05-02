'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'unauth.riskLegend.dismissed';

export default function RiskLegend() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg px-4 py-3 text-sm border"
      style={{
        background: 'var(--info-bg)',
        borderColor: 'var(--info-bd)',
        color: 'var(--info)',
      }}
    >
      <p>
        Match confidence is 0&ndash;100.{' '}
        <strong>Weak</strong> (0&ndash;24): low confidence.{' '}
        <strong>Possible</strong> (25&ndash;49): worth watching.{' '}
        <strong>Probable</strong> (50&ndash;74): likely identity match.{' '}
        <strong>Definite</strong> (75+): high-confidence identity match.
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-xs underline opacity-70 hover:opacity-100"
      >
        Dismiss
      </button>
    </div>
  );
}
