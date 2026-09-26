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
  const dirty = Boolean(state.merchant) && (
    state.storeName.trim() !== state.merchant?.name ||
    state.monthlyVolume !== (state.merchant?.monthly_order_volume ?? '') ||
    state.fraudConcern !== (state.merchant?.primary_fraud_concern ?? '')
  );
  return (
    <SectionCard joined title="Workspace profile" description="Saved workspace identity and future review defaults">
      <form onSubmit={onSave} className="space-y-5">
        <div>
          <label htmlFor="account-email" className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1" style={{ color: '#1c1f23' }}>
            Email address
          </label>
          <Input
            id="account-email"
            type="email"
            className="max-w-sm"
            value={state.userEmail}
            disabled
          />
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1" style={{ color: '#64686d' }}>
            To change your email, contact{' '}
            <a href="mailto:support@unauth.app" className="underline" style={{ color: '#40454a' }}>support@unauth.app</a>.
          </p>
        </div>

        <div>
          <label htmlFor="account-store-name" className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1" style={{ color: '#1c1f23' }}>
            Store / business name <span style={{ color: '#b0431a' }}>*</span>
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
          <label htmlFor="account-monthly-volume" className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1" style={{ color: '#1c1f23' }}>
            Monthly order volume
          </label>
          <div className="max-w-sm">
            <Select
              id="account-monthly-volume"
              value={state.monthlyVolume}
              onChange={(e) => dispatch({ type: 'patch', patch: { monthlyVolume: e.target.value } })}
            >
              <option value="">Select a range…</option>
              {ORDER_VOLUME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="account-loss-concern" className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1" style={{ color: '#1c1f23' }}>
            Primary review focus
          </label>
          <div className="max-w-sm">
            <Select
              id="account-loss-concern"
              value={state.fraudConcern}
              onChange={(e) => dispatch({ type: 'patch', patch: { fraudConcern: e.target.value } })}
            >
              <option value="">Select…</option>
              {LOSS_CONCERN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {state.saveError ? (
          <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#b0431a' }}>{state.saveError}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={state.saving} disabled={!state.merchant || !dirty} leadingIcon={<Save className="h-3.5 w-3.5" />}>
            {state.saving ? 'Saving…' : dirty ? 'Save changes' : 'Changes saved'}
          </Button>
          {state.saveSuccess ? (
            <span className="text-[11.5px] leading-[1.45] text-[#64686d] flex items-center gap-1" style={{ color: '#1a6b43' }}>
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : null}
        </div>
      </form>
    </SectionCard>
  );
}
