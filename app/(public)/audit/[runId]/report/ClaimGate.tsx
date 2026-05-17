'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ClaimGate({ auditId, email }: { auditId: string; email: string }) {
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!storeName.trim()) {
      setError('Store name is required.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          store_name: storeName.trim(),
          setup_complete: true,
        },
      },
    });

    if (signUp.error && !signUp.error.message.toLowerCase().includes('already')) {
      setLoading(false);
      setError(signUp.error.message);
      return;
    }

    if (!signUp.data.session) {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        setLoading(false);
        setError('Account created. Please verify your email, then sign in to view this report.');
        return;
      }
    }

    const claim = await fetch(`/api/public-audit/${auditId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: storeName.trim() }),
    });
    const claimBody = await claim.json().catch(() => ({}));
    setLoading(false);
    if (!claim.ok) {
      setError(typeof claimBody?.error === 'string' ? claimBody.error : 'Could not link audit to your account.');
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-lg border bg-[#FDFBF6] p-7" style={{ borderColor: '#D8D0BD' }}>
      <h2
        style={{
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: 'clamp(24px, 3vw, 36px)',
          fontWeight: 500,
          lineHeight: 1.12,
          letterSpacing: '-0.02em',
          marginBottom: '14px',
          color: '#1A1814',
        }}
      >
        Create a free account to view your report.
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Email
          </label>
          <input value={email} disabled style={inputStyle} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Store name
          </label>
          <input value={storeName} onChange={(event) => setStoreName(event.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Password
          </label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Confirm password
          </label>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required style={inputStyle} />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm" style={{ color: '#7B2D26' }}>{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          marginTop: '16px',
          background: '#1A1814',
          color: '#E8E4D8',
          border: '1px solid #1A1814',
          padding: '12px 14px',
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: '15px',
          fontWeight: 500,
          opacity: loading ? 0.75 : 1,
        }}
      >
        {loading ? 'Linking account...' : 'View my report →'}
      </button>

      <p className="mt-3 text-sm" style={{ color: '#8A8472', marginBottom: 0 }}>
        Free forever for siloed audits. No card required.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FAF6EF',
  border: '1px solid #D2C9B5',
  color: '#1A1814',
  padding: '10px 12px',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
  fontSize: '14px',
};
