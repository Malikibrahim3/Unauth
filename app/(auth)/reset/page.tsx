'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--ink-tertiary)',
  marginBottom: '6px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '13px',
  color: 'var(--ink-primary)',
  background: 'var(--surface-input)',
  border: '1px solid var(--surface-border)',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset/update`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        fontFamily: 'var(--font-geist), var(--font-dm-sans), sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Link href="/login" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: 18 }}>
          <span style={{ color: 'var(--ink-primary)', fontSize: 20, fontWeight: 600 }}>
            Unauth<span style={{ color: 'var(--copper-bright)' }}>.</span>
          </span>
        </Link>
        <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', borderRadius: 10, padding: 32 }}>
          <div style={{ marginBottom: '28px' }}>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ink-tertiary)',
                marginBottom: '10px',
              }}
            >
              ACCOUNT RECOVERY
            </p>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: 0,
                color: 'var(--ink-primary)',
                lineHeight: 1.2,
              }}
            >
              Reset your password
            </h2>
          </div>

          {sent ? (
            <div
              style={{
                padding: '16px',
                background: 'var(--sev-clear-fill)',
                border: '1px solid color-mix(in srgb, var(--sev-clear) 45%, transparent)',
                borderRadius: '6px',
                fontSize: '13px',
                color: 'var(--ink-secondary)',
                lineHeight: 1.5,
              }}
            >
              Check your inbox — we&apos;ve sent a reset link to <strong>{email}</strong>.
              <br />
              <br />
              <Link href="/login" style={{ color: 'var(--sev-clear)', fontWeight: 500 }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label style={LABEL_STYLE}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  style={INPUT_BASE}
                />
              </div>

              {error && (
                <p style={{ fontSize: '12px', color: 'var(--sev-definite)', margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  padding: '11px 20px',
                  background: loading || !email ? 'var(--surface-muted)' : 'var(--copper-bright)',
                  color: loading || !email ? 'var(--ink-tertiary)' : 'var(--ink-inverse)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: '13px', color: 'var(--ink-secondary)', textDecoration: 'none' }}>
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
