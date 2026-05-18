'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      router.push('/dashboard');
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
              Choose a new password
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div>
              <label style={LABEL_STYLE}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                style={INPUT_BASE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                style={INPUT_BASE}
              />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: '#C0392B', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                padding: '11px 20px',
                background: loading || !password || !confirm ? '#C8C0B0' : '#1A1814',
                color: '#F8F5EE',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
