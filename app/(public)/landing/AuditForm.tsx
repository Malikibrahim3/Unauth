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

    // Store email in sessionStorage so the /audit page can pre-fill it
    sessionStorage.setItem('auditPrefillEmail', email);
    router.push('/audit');
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: t.ink,
        border: `1px solid ${t.darkBorder}`,
        padding: '22px',
      }}
    >
      <p
        style={{
          fontFamily: t.mono,
          fontSize: '10.5px',
          color: t.inkTertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: '14px',
        }}
      >
        Free audit · no card
      </p>

      {/* Email */}
      <div style={{ marginBottom: '10px' }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@yourstore.com"
          style={{
            display: 'block',
            width: '100%',
            background: t.darkBg,
            border: `1px solid ${t.darkBorder}`,
            color: t.darkBright,
            fontFamily: t.sans,
            fontSize: '14px',
            padding: '11px 14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = t.accent; }}
          onBlur={e => { e.currentTarget.style.borderColor = t.darkBorder; }}
        />
      </div>

      {/* File drop zone */}
      <div
        style={{
          marginBottom: '12px',
          border: `1px dashed ${t.darkBorder}`,
          padding: '16px',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = t.accent; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = t.darkBorder; }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = t.darkBorder;
          const dropped = e.dataTransfer.files?.[0];
          if (dropped && fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(dropped);
            fileRef.current.files = dt.files;
            setFileName(dropped.name);
          }
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <p
          style={{
            fontFamily: t.mono,
            fontSize: '11px',
            color: fileName ? t.darkBright : t.inkTertiary,
            margin: 0,
            letterSpacing: '0.06em',
          }}
        >
          {fileName ?? 'Drop CSV or click to select'}
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: t.accent,
          color: t.accentFg,
          fontFamily: t.sans,
          fontSize: '15px',
          fontWeight: 500,
          padding: '14px 18px',
          border: 'none',
          cursor: 'pointer',
          marginBottom: errorMsg ? '10px' : 0,
          transition: 'background 160ms ease',
        }}
      >
        <span>{status === 'submitting' ? 'Loading…' : 'Run free audit'}</span>
        <span style={{ fontFamily: t.mono }}>→</span>
      </button>

      {errorMsg && (
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
      )}

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
