'use client';

import { useState, useEffect } from 'react';
import { User, ArrowLeft, Save, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Select, SectionCard } from '@/components/ui';
import { ORDER_VOLUME_OPTIONS, FRAUD_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';

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
  const [_currentPassword, setCurrentPassword] = useState('');
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
      const res = await fetch('/api/account/setup');
      if (!res.ok) return;
      const data = await res.json() as { user?: { email?: string }; merchant?: MerchantData | null };
      setUserEmail(data.user?.email ?? '');

      if (data.merchant) {
        const raw = data.merchant;
        setMerchant(raw);
        setStoreName(raw.name ?? '');
        setMonthlyVolume(raw.monthly_order_volume ?? '');
        setFraudConcern(raw.primary_fraud_concern ?? '');
      }
    }
    load();
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      if (!merchant) throw new Error('Merchant not loaded');
      const res = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          monthlyOrderVolume: monthlyVolume || null,
          primaryFraudConcern: fraudConcern || null,
          setupComplete: merchant.setup_complete,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Could not save merchant profile.');
      }
      setMerchant({ ...merchant, name: storeName.trim(), monthly_order_volume: monthlyVolume || null, primary_fraud_concern: fraudConcern || null });
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
      <SectionCard title="Profile" description="Store details and review preferences">
      <form
        onSubmit={handleProfileSave}
        className="space-y-5"
      >

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Email address
          </label>
          <Input
            type="email"
            value={userEmail}
            disabled
            className="opacity-50 cursor-not-allowed"
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
          <Input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            placeholder="Your store name"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Monthly order volume
          </label>
          <Select
            value={monthlyVolume}
            onChange={(e) => setMonthlyVolume(e.target.value)}
          >
            <option value="">Select a range…</option>
            {ORDER_VOLUME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Primary review focus
          </label>
          <Select
            value={fraudConcern}
            onChange={(e) => setFraudConcern(e.target.value)}
          >
            <option value="">Select…</option>
            {FRAUD_CONCERN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        {saveError && (
          <p className="text-xs" style={{ color: 'var(--risk-critical)' }}>{saveError}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} leadingIcon={<Save className="h-3.5 w-3.5" />}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {saveSuccess && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--success)' }}>
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </form>
      </SectionCard>

      {/* Password Change */}
      <SectionCard title="Notifications" description="Password and access controls">
      <form
        onSubmit={handlePasswordChange}
        className="space-y-4"
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
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
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

        <Button type="submit" loading={passwordSaving} disabled={!newPassword}>
          {passwordSaving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard
        title="Account"
        description="Destructive actions"
        className="border-[rgba(159,29,29,0.30)]"
      >
      <div className="space-y-4">
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
            <Input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="px-3 py-2 rounded-md text-sm focus:outline-none w-40"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleteLoading}
              loading={deleteLoading}
            >
              {deleteLoading ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </div>
      </SectionCard>
    </div>
  );
}
