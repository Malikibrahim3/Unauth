'use client';

import React, { useState, useRef } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function AuditForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [email, setEmail] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrorMsg('Please select a CSV file.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const form = new FormData();
    form.append('email', email);
    form.append('file', file);

    try {
      const res = await fetch('/api/audit/start', { method: 'POST', body: form });
      if (!res.ok) throw new Error();
      setSubmittedEmail(email);
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Email hello@unauth.app directly.');
    }
  }

  if (status === 'success') {
    return (
      <div
        style={{
          background: '#1A1814',
          border: '1px solid #2B2922',
          padding: '22px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '10.5px',
            color: '#8A8472',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: '14px',
          }}
        >
          Audit submitted
        </p>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '16px',
            fontWeight: 500,
            color: '#E8E4D8',
            marginBottom: '8px',
          }}
        >
          Your audit is running.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '14px',
            color: '#B8B2A0',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          Results coming to {submittedEmail}. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#1A1814',
        border: '1px solid #2B2922',
        padding: '22px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-dm-mono, monospace)',
          fontSize: '10.5px',
          color: '#8A8472',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: '14px',
        }}
      >
        Run free audit — no card required
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
            background: '#15140F',
            border: '1px solid #2B2922',
            color: '#E8E4D8',
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
            padding: '11px 14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#7B2D26'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#2B2922'; }}
        />
      </div>

      {/* File drop zone */}
      <div
        style={{
          marginBottom: '12px',
          border: '1px dashed #2B2922',
          padding: '16px',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#7B2D26'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = '#2B2922'; }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.style.borderColor = '#2B2922';
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
            fontFamily: 'var(--font-dm-mono, monospace)',
            fontSize: '11px',
            color: fileName ? '#E8E4D8' : '#8A8472',
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
          background: status === 'submitting' ? '#5E2018' : '#7B2D26',
          color: '#F8F5EE',
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: '15px',
          fontWeight: 500,
          padding: '14px 18px',
          border: 'none',
          cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
          marginBottom: errorMsg ? '10px' : 0,
          transition: 'background 160ms ease',
        }}
      >
        <span>{status === 'submitting' ? 'Submitting…' : 'Run free audit'}</span>
        <span style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>→</span>
      </button>

      {errorMsg && (
        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontStyle: 'italic',
            fontSize: '12px',
            color: '#B6512A',
            margin: '0 0 10px',
          }}
        >
          {errorMsg}
        </p>
      )}

      <p
        style={{
          fontFamily: 'var(--font-serif, serif)',
          fontStyle: 'italic',
          fontSize: '12.5px',
          color: '#8A8472',
          lineHeight: 1.5,
          marginTop: '12px',
          marginBottom: 0,
        }}
      >
        ~20 minutes. Results emailed to you. No account required.
      </p>
    </form>
  );
}
