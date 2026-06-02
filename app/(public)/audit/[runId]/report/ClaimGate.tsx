'use client';

import { useReducer, type CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/client';

type ClaimGateState = {
  storeName: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
};

type ClaimGateAction = { type: 'patch'; patch: Partial<ClaimGateState> };

function claimGateReducer(state: ClaimGateState, action: ClaimGateAction): ClaimGateState {
  if (action.type === 'patch') return { ...state, ...action.patch };
  return state;
}

export default function ClaimGate({ auditId, email }: { auditId: string; email: string }) {
  const [state, dispatch] = useReducer(claimGateReducer, {
    storeName: '',
    password: '',
    confirmPassword: '',
    loading: false,
    error: '',
  });
  const { storeName, password, confirmPassword, loading, error } = state;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    dispatch({ type: 'patch', patch: { error: '' } });

    if (password !== confirmPassword) {
      dispatch({ type: 'patch', patch: { error: 'Passwords do not match.' } });
      return;
    }
    if (!storeName.trim()) {
      dispatch({ type: 'patch', patch: { error: 'Store name is required.' } });
      return;
    }

    dispatch({ type: 'patch', patch: { loading: true } });
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
      dispatch({ type: 'patch', patch: { loading: false, error: signUp.error.message } });
      return;
    }

    if (!signUp.data.session) {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        dispatch({
          type: 'patch',
          patch: {
            loading: false,
            error: 'Account created. Please verify your email, then sign in to view this report.',
          },
        });
        return;
      }
    }

    const claim = await fetch(`/api/public-audit/${auditId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: storeName.trim() }),
    });
    const claimBody = await claim.json().catch(() => ({}));
    dispatch({ type: 'patch', patch: { loading: false } });
    if (!claim.ok) {
      dispatch({
        type: 'patch',
        patch: {
          error: typeof claimBody?.error === 'string' ? claimBody.error : 'Could not link audit to your account.',
        },
      });
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
          <label htmlFor="claim-gate-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Email
          </label>
          <input id="claim-gate-email" value={email} readOnly disabled style={inputStyle} />
        </div>
        <div>
          <label htmlFor="claim-gate-store-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Store name
          </label>
          <input id="claim-gate-store-name" value={storeName} onChange={(event) => dispatch({ type: 'patch', patch: { storeName: event.target.value } })} required style={inputStyle} />
        </div>
        <div>
          <label htmlFor="claim-gate-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Password
          </label>
          <input id="claim-gate-password" type="password" value={password} onChange={(event) => dispatch({ type: 'patch', patch: { password: event.target.value } })} required style={inputStyle} />
        </div>
        <div>
          <label htmlFor="claim-gate-confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
            Confirm password
          </label>
          <input id="claim-gate-confirm-password" type="password" value={confirmPassword} onChange={(event) => dispatch({ type: 'patch', patch: { confirmPassword: event.target.value } })} required style={inputStyle} />
        </div>
      </div>

      {error ? <p className="mt-4 text-sm" style={{ color: '#7B2D26' }}>{error}</p> : null}

      <button type="submit" disabled={loading} className="ua-claim-gate-submit">
        {loading ? 'Linking account…' : 'View my report →'}
      </button>

      <p className="mt-3 text-sm" style={{ color: '#8A8472', marginBottom: 0 }}>
        Free forever for siloed audits. No card required.
      </p>
    </form>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#FAF6EF',
  border: '1px solid #D2C9B5',
  color: '#1A1814',
  padding: '10px 12px',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
  fontSize: '14px',
};
