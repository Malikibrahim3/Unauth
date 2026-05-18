'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#5C6670',
  marginBottom: '6px',
  letterSpacing: '0.01em',
};

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  color: '#1A1814',
  background: '#FDFAF4',
  border: '1px solid #D2C9B5',
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
        background: '#F8F5EE',
        display: 'flex',
        fontFamily: 'var(--font-dm-sans, sans-serif)',
      }}
    >
      <div
        className="hidden lg:flex"
        style={{
          width: '50%',
          flexShrink: 0,
          minHeight: '100vh',
          padding: '44px 48px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #D2C9B5',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <UnauthLogo variant="wordmark-light" size={125} />
        </Link>
      </div>

      <div
        style={{
          width: '50%',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          overflowY: 'auto',
        }}
        className="max-lg:w-full"
      >
        <div className="lg:hidden" style={{ marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <UnauthLogo variant="wordmark-light" size={22} />
          </Link>
        </div>

        <div style={{ width: '100%', maxWidth: '408px' }}>
          <div style={{ marginBottom: '28px' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#78889C',
                marginBottom: '10px',
              }}
            >
              ACCOUNT RECOVERY
            </p>
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: '#1A1814',
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
                background: '#F0F9F0',
                border: '1px solid #B8DFB8',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#2D6A2D',
                lineHeight: 1.5,
              }}
            >
              Check your inbox — we&apos;ve sent a reset link to <strong>{email}</strong>.
              <br />
              <br />
              <Link href="/login" style={{ color: '#2D6A2D', fontWeight: 500 }}>
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
                <p style={{ fontSize: '13px', color: '#C0392B', margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  padding: '11px 20px',
                  background: loading || !email ? '#C8C0B0' : '#1A1814',
                  color: '#F8F5EE',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: loading || !email ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: '13px', color: '#78889C', textDecoration: 'none' }}>
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
