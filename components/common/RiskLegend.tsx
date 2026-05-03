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
        <strong>Weak</strong>: low signal — keep an eye on it.{' '}
        <strong>Possible</strong>: something looks off — worth a closer look.{' '}
        <strong>Probable</strong>: likely abuse pattern — review before approving.{' '}
        <strong>Definite</strong>: high-confidence match — act now.
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
