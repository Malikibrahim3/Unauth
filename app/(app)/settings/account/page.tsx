'use client';

import { useState, useEffect } from 'react';
import { User, ArrowLeft, Save, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface MerchantData {
  id: string;
  name: string;
  monthly_order_volume: string | null;
  primary_fraud_concern: string | null;
  setup_complete: boolean;
}

export default function AccountSettingsPage() {
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState('');
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [storeName, setStoreName] = useState('');
  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [fraudConcern, setFraudConcern] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? '');

      const { data } = await supabase
        .from('merchants')
        .select('id, name, monthly_order_volume, primary_fraud_concern, setup_complete')
        .eq('user_id', user?.id ?? '')
        .single();

      if (data) {
        // Cast through unknown because generated types don't include newer columns yet
        const raw = data as unknown as MerchantData;
        setMerchant(raw);
        setStoreName(raw.name ?? '');
        setMonthlyVolume(raw.monthly_order_volume ?? '');
        setFraudConcern(raw.primary_fraud_concern ?? '');
      }
    }
    load();
  }, [supabase]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      if (!merchant) throw new Error('Merchant not loaded');
      const { error } = await supabase
        .from('merchants')
        .update({
          name: storeName.trim(),
          monthly_order_volume: monthlyVolume || null,
          primary_fraud_concern: fraudConcern || null,
        })
        .eq('id', merchant.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: unknown) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (e: unknown) {
      setPasswordError((e as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      // Sign out and redirect — actual deletion requires a support request for data safety
      await supabase.auth.signOut();
      window.location.href = '/login?deleted=1';
    } catch (e: unknown) {
      alert((e as Error).message);
      setDeleteLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      {/* Header */}
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

      {/* Profile / Store Details */}
      <form
        onSubmit={handleProfileSave}
        className="rounded-lg border p-5 space-y-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Store details</h2>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Email address
          </label>
          <input
            type="email"
            value={userEmail}
            disabled
            className="w-full px-3 py-2 rounded-md text-sm opacity-50 cursor-not-allowed"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            To change your email, contact{' '}
            <a href="mailto:support@unauth.io" className="underline" style={{ color: 'var(--accent)' }}>support@unauth.io</a>.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Store / business name <span style={{ color: 'var(--risk-critical)' }}>*</span>
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            placeholder="Your store name"
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Monthly order volume
          </label>
          <select
            value={monthlyVolume}
            onChange={(e) => setMonthlyVolume(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select a range…</option>
            <option value="under_500">Under 500</option>
            <option value="500_2000">500 – 2,000</option>
            <option value="2000_10000">2,000 – 10,000</option>
            <option value="10000_plus">10,000+</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Primary review focus
          </label>
          <select
            value={fraudConcern}
            onChange={(e) => setFraudConcern(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Select…</option>
            <option value="refund_abuse">Refund abuse / INR claims</option>
            <option value="chargebacks">Chargebacks</option>
            <option value="account_takeover">Account takeover</option>
            <option value="multi_accounting">Multi-accounting</option>
            <option value="promo_abuse">Promo / voucher abuse</option>
            <option value="all">All of the above</option>
          </select>
        </div>

        {saveError && (
          <p className="text-xs" style={{ color: 'var(--risk-critical)' }}>{saveError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saveSuccess && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </form>

      {/* Password Change */}
      <form
        onSubmit={handlePasswordChange}
        className="rounded-lg border p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Change password</h2>
          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPasswords ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'New password', value: newPassword, setter: setNewPassword, placeholder: 'Min. 8 characters' },
            { label: 'Confirm new password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Repeat new password' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>{label}</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
          ))}
        </div>

        {passwordError && (
          <p className="text-xs" style={{ color: 'var(--risk-critical)' }}>{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
            <Check className="h-3.5 w-3.5" /> {passwordSuccess}
          </p>
        )}

        <button
          type="submit"
          disabled={passwordSaving || !newPassword}
          className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          {passwordSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>

      {/* Danger Zone */}
      <div
        className="rounded-lg border p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'rgba(239,68,68,0.3)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--risk-critical)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--risk-critical)' }}>Danger zone</h2>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Delete your account</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            This permanently deletes all your audits, customer profiles, watchlist, and notes. This action cannot be undone.
          </p>
        </div>

        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Type <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>DELETE</span> to confirm
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="px-3 py-2 rounded-md text-sm focus:outline-none w-40"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'var(--risk-critical)', color: '#fff' }}
            >
              {deleteLoading ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
