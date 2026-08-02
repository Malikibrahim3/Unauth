'use client';

import { Save, Check } from 'lucide-react';
import { Button, Input, Select, SectionCard } from '@/components/ui';
import { ORDER_VOLUME_OPTIONS, LOSS_CONCERN_OPTIONS } from '@/lib/constants/merchantProfile';
import type { AccountSettingsAction, AccountSettingsState } from '@/components/settings/accountSettingsReducer';

type Props = {
  state: AccountSettingsState;
  dispatch: React.Dispatch<AccountSettingsAction>;
  onSave: (e: React.FormEvent) => void;
};

export default function AccountProfileSection({ state, dispatch, onSave }: Props) {
  return (
    <SectionCard joined title="Profile" description="Store details and review preferences">
      <form onSubmit={onSave} className="space-y-5">
        <div>
          <label htmlFor="account-email" className="ua-text-label block mb-1" style={{ color: 'var(--ua-text-primary)' }}>
            Email address
          </label>
          <Input
            id="account-email"
            type="email"
            className="max-w-sm"
            value={state.userEmail}
            disabled
          />
          <p className="ua-text-caption-role mt-1" style={{ color: 'var(--ua-text-secondary)' }}>
            To change your email, contact{' '}
            <a href="mailto:support@unauth.app" className="underline" style={{ color: 'var(--ua-action-primary)' }}>support@unauth.app</a>.
          </p>
        </div>

        <div>
          <label htmlFor="account-store-name" className="ua-text-label block mb-1" style={{ color: 'var(--ua-text-primary)' }}>
            Store / business name <span style={{ color: 'var(--ua-risk-critical)' }}>*</span>
          </label>
          <Input
            id="account-store-name"
            type="text"
            className="max-w-sm"
            value={state.storeName}
            onChange={(e) => dispatch({ type: 'patch', patch: { storeName: e.target.value } })}
            required
            placeholder="Your store name"
          />
        </div>

        <div>
          <label htmlFor="account-monthly-volume" className="ua-text-label block mb-1" style={{ color: 'var(--ua-text-primary)' }}>
            Monthly order volume
          </label>
          <Select
            id="account-monthly-volume"
            className="max-w-sm"
            value={state.monthlyVolume}
            onChange={(e) => dispatch({ type: 'patch', patch: { monthlyVolume: e.target.value } })}
          >
            <option value="">Select a range…</option>
            {ORDER_VOLUME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="account-loss-concern" className="ua-text-label block mb-1" style={{ color: 'var(--ua-text-primary)' }}>
            Primary review focus
          </label>
          <Select
            id="account-loss-concern"
            className="max-w-sm"
            value={state.fraudConcern}
            onChange={(e) => dispatch({ type: 'patch', patch: { fraudConcern: e.target.value } })}
          >
            <option value="">Select…</option>
            {LOSS_CONCERN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        {state.saveError ? (
          <p className="ua-text-caption-role" style={{ color: 'var(--ua-risk-critical)' }}>{state.saveError}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={state.saving} disabled={!state.merchant} leadingIcon={<Save className="h-3.5 w-3.5" />}>
            {state.saving ? 'Saving…' : 'Save changes'}
          </Button>
          {state.saveSuccess ? (
            <span className="ua-text-caption-role flex items-center gap-1" style={{ color: 'var(--ua-success)' }}>
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : null}
        </div>
      </form>
    </SectionCard>
  );
}
