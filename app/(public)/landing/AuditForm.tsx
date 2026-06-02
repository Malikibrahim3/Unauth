'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { t } from './_tokens';

type Status = 'idle' | 'submitting' | 'error';

export default function AuditForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [email, setEmail] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrorMsg('Please select a CSV file.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    sessionStorage.setItem('auditPrefillEmail', email);
    router.push('/audit');
  }

  function assignDroppedFile(dropped: File) {
    if (!fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(dropped);
    fileRef.current.files = dt.files;
    setFileName(dropped.name);
  }

  return (
    <form onSubmit={handleSubmit} className="ua-landing-audit-form">
      <p className="ua-landing-audit-form-label">Free audit · no card</p>

      <div style={{ marginBottom: '10px' }}>
        <input
          type="email"
          required
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourstore.com"
          className="ua-landing-audit-form-input"
        />
      </div>

      <label className="ua-landing-audit-form-drop block">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Order export CSV file"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) assignDroppedFile(dropped);
          }}
        />
        <p
          style={{
            fontFamily: t.mono,
            fontSize: '12px',
            color: fileName ? t.darkBright : t.inkTertiary,
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          {fileName ?? 'Drop CSV or click to select'}
        </p>
      </label>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="ua-landing-audit-form-submit"
        style={{ marginBottom: errorMsg ? '10px' : 0 }}
      >
        <span>{status === 'submitting' ? 'Loading…' : 'Run free audit'}</span>
        <span style={{ fontFamily: t.mono }}>→</span>
      </button>

      {errorMsg ? (
        <p
          style={{
            fontFamily: t.serif,
            fontStyle: 'italic',
            fontSize: '12px',
            color: t.accent,
            margin: '0 0 10px',
          }}
        >
          {errorMsg}
        </p>
      ) : null}

      <p
        style={{
          fontFamily: t.serif,
          fontStyle: 'italic',
          fontSize: '12.5px',
          color: t.inkTertiary,
          lineHeight: 1.5,
          marginTop: '12px',
          marginBottom: 0,
        }}
      >
        About 20 minutes. No account required.
      </p>
    </form>
  );
}
