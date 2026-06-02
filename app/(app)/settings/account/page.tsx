'use client';

import { useReducer, useRef } from 'react';
import { User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  accountSettingsReducer,
  initialAccountSettingsState,
  type MerchantData,
} from '@/components/settings/accountSettingsReducer';
import AccountProfileSection from '@/components/settings/AccountProfileSection';
import AccountPasswordSection from '@/components/settings/AccountPasswordSection';
import AccountDangerSection from '@/components/settings/AccountDangerSection';

type AccountSetupPayload = {
  user?: { email?: string };
  merchant?: MerchantData | null;
};

export default function AccountSettingsPage() {
  const supabase = createClient();
  const [state, dispatch] = useReducer(accountSettingsReducer, initialAccountSettingsState);
  const hydratedRef = useRef(false);

  const { data: setupData } = useFetchJson<AccountSetupPayload>('/api/account/setup');

  if (setupData && !hydratedRef.current) {
    hydratedRef.current = true;
    dispatch({
      type: 'loadAccount',
      userEmail: setupData.user?.email ?? '',
      merchant: setupData.merchant ?? null,
    });
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'patch', patch: { saving: true, saveError: '', saveSuccess: false } });
    try {
      if (!state.merchant) {
        dispatch({ type: 'patch', patch: { saveError: 'Still loading your store profile. Wait a moment and try again.', saving: false } });
        return;
      }
      const res = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: state.storeName.trim(),
          monthlyOrderVolume: state.monthlyVolume || null,
          primaryFraudConcern: state.fraudConcern || null,
          setupComplete: state.merchant.setup_complete,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Could not save merchant profile.');
      }
      dispatch({
        type: 'profileSaved',
        merchant: {
          ...state.merchant,
          name: state.storeName.trim(),
          monthly_order_volume: state.monthlyVolume || null,
          primary_fraud_concern: state.fraudConcern || null,
        },
      });
      window.setTimeout(() => dispatch({ type: 'patch', patch: { saveSuccess: false } }), 4000);
    } catch (e: unknown) {
      dispatch({ type: 'patch', patch: { saveError: (e as Error).message, saving: false } });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'patch', patch: { passwordError: '', passwordSuccess: '' } });
    if (state.newPassword.length < 8) {
      dispatch({ type: 'patch', patch: { passwordError: 'New password must be at least 8 characters.' } });
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      dispatch({ type: 'patch', patch: { passwordError: 'Passwords do not match.' } });
      return;
    }
    dispatch({ type: 'patch', patch: { passwordSaving: true } });
    try {
      const { error } = await supabase.auth.updateUser({ password: state.newPassword });
      if (error) throw error;
      dispatch({
        type: 'patch',
        patch: {
          passwordSuccess: 'Password updated successfully.',
          newPassword: '',
          confirmPassword: '',
          passwordSaving: false,
        },
      });
      window.setTimeout(() => dispatch({ type: 'patch', patch: { passwordSuccess: '' } }), 5000);
    } catch (e: unknown) {
      dispatch({ type: 'patch', patch: { passwordError: (e as Error).message, passwordSaving: false } });
    }
  }

  async function handleDeleteAccount() {
    if (state.deleteConfirm !== 'DELETE') return;
    dispatch({ type: 'patch', patch: { deleteLoading: true } });
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Delete failed. Please try again.');
      }
      await supabase.auth.signOut();
      window.location.href = '/login?deleted=1';
    } catch (e: unknown) {
      alert((e as Error).message);
      dispatch({ type: 'patch', patch: { deleteLoading: false } });
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <User className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Account & Profile</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Update your store information and account preferences.
        </p>
      </div>

      <AccountProfileSection state={state} dispatch={dispatch} onSave={handleProfileSave} />
      <AppearanceSettings />
      <AccountPasswordSection state={state} dispatch={dispatch} onSubmit={handlePasswordChange} />
      <AccountDangerSection state={state} dispatch={dispatch} onDelete={handleDeleteAccount} />
    </div>
  );
}
